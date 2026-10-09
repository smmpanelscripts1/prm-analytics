<?php

namespace Prm\Analytics;

use Carbon\Carbon;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Schema\Builder as SchemaBuilder;

class AnalyticsService
{
    public function __construct(
        protected ConnectionInterface $db
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(string $range): array
    {
        $days = match ($range) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };

        $labels = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $labels[] = Carbon::now()->subDays($i)->toDateString();
        }

        $start = Carbon::now()->subDays($days - 1)->startOfDay();
        $prevStart = Carbon::now()->subDays(($days * 2) - 1)->startOfDay();
        $prevEnd = Carbon::now()->subDays($days)->endOfDay();

        $schema = $this->db->getSchemaBuilder();

        $users = $this->countBetween('users', 'joined_at', $start);
        $usersPrev = $this->countBetween('users', 'joined_at', $prevStart, $prevEnd);
        $discussions = $this->countBetween('discussions', 'created_at', $start, null, fn (Builder $q) => $q->where('is_private', 0));
        $discussionsPrev = $this->countBetween('discussions', 'created_at', $prevStart, $prevEnd, fn (Builder $q) => $q->where('is_private', 0));
        $posts = $this->countBetween('posts', 'created_at', $start, null, fn (Builder $q) => $q->where('type', 'comment')->where('is_private', 0));
        $postsPrev = $this->countBetween('posts', 'created_at', $prevStart, $prevEnd, fn (Builder $q) => $q->where('type', 'comment')->where('is_private', 0));

        $hasLikes = $schema->hasTable('post_likes');
        $likes = $hasLikes ? $this->countBetween('post_likes', 'created_at', $start) : 0;
        $likesPrev = $hasLikes ? $this->countBetween('post_likes', 'created_at', $prevStart, $prevEnd) : 0;

        $hasReports = $schema->hasTable('moderation_reports');
        $hasTickets = $schema->hasTable('moderation_tickets');
        $hasWarnings = $schema->hasTable('moderation_warnings');
        $hasTrade = $schema->hasTable('trade_feedbacks');

        $reports = $hasReports ? $this->countBetween('moderation_reports', 'created_at', $start) : 0;
        $reportsPrev = $hasReports ? $this->countBetween('moderation_reports', 'created_at', $prevStart, $prevEnd) : 0;
        $tickets = $hasTickets ? $this->countBetween('moderation_tickets', 'created_at', $start) : 0;
        $ticketsPrev = $hasTickets ? $this->countBetween('moderation_tickets', 'created_at', $prevStart, $prevEnd) : 0;
        $warnings = $hasWarnings ? $this->countBetween('moderation_warnings', 'created_at', $start) : 0;
        $warningsPrev = $hasWarnings ? $this->countBetween('moderation_warnings', 'created_at', $prevStart, $prevEnd) : 0;
        $trade = $hasTrade ? $this->countBetween('trade_feedbacks', 'created_at', $start) : 0;
        $tradePrev = $hasTrade ? $this->countBetween('trade_feedbacks', 'created_at', $prevStart, $prevEnd) : 0;

        return [
            'range' => $range === '7d' || $range === '90d' ? $range : '30d',
            'generatedAt' => Carbon::now()->toIso8601String(),
            'available' => [
                'likes' => $hasLikes,
                'moderation' => $hasReports || $hasTickets || $hasWarnings,
                'reports' => $hasReports,
                'tickets' => $hasTickets,
                'warnings' => $hasWarnings,
                'trade' => $hasTrade,
                'tags' => $schema->hasTable('tags') && $schema->hasTable('discussion_tag'),
            ],
            'kpis' => [
                'users' => $this->kpi($this->lifetime('users'), $users, $usersPrev),
                'discussions' => $this->kpi(
                    $this->lifetime('discussions', fn (Builder $q) => $q->where('is_private', 0)),
                    $discussions,
                    $discussionsPrev
                ),
                'posts' => $this->kpi(
                    $this->lifetime('posts', fn (Builder $q) => $q->where('type', 'comment')->where('is_private', 0)),
                    $posts,
                    $postsPrev
                ),
                'likes' => $hasLikes ? $this->kpi($this->lifetime('post_likes'), $likes, $likesPrev) : null,
                'reports' => $hasReports ? $this->kpi($this->lifetime('moderation_reports'), $reports, $reportsPrev) : null,
                'tickets' => $hasTickets ? $this->kpi($this->lifetime('moderation_tickets'), $tickets, $ticketsPrev) : null,
                'warnings' => $hasWarnings ? $this->kpi($this->lifetime('moderation_warnings'), $warnings, $warningsPrev) : null,
                'trade' => $hasTrade ? $this->kpi($this->lifetime('trade_feedbacks'), $trade, $tradePrev) : null,
                'pendingReports' => $hasReports
                    ? (int) $this->db->table('moderation_reports')->where('status', 'pending')->count()
                    : null,
                'openTickets' => $hasTickets
                    ? (int) $this->db->table('moderation_tickets')->whereIn('status', ['open', 'waiting', 'answered'])->count()
                    : null,
            ],
            'series' => [
                'labels' => $labels,
                'users' => $this->series('users', 'joined_at', $start, $labels),
                'discussions' => $this->series('discussions', 'created_at', $start, $labels, fn (Builder $q) => $q->where('is_private', 0)),
                'posts' => $this->series('posts', 'created_at', $start, $labels, fn (Builder $q) => $q->where('type', 'comment')->where('is_private', 0)),
                'likes' => $hasLikes ? $this->series('post_likes', 'created_at', $start, $labels) : null,
                'reports' => $hasReports ? $this->series('moderation_reports', 'created_at', $start, $labels) : null,
                'tickets' => $hasTickets ? $this->series('moderation_tickets', 'created_at', $start, $labels) : null,
                'warnings' => $hasWarnings ? $this->series('moderation_warnings', 'created_at', $start, $labels) : null,
                'trade' => $hasTrade ? $this->series('trade_feedbacks', 'created_at', $start, $labels) : null,
            ],
            'breakdowns' => [
                'reportsByStatus' => $hasReports ? $this->groupCount('moderation_reports', 'status', $start) : null,
                'reportsByReason' => $hasReports ? $this->groupCount('moderation_reports', 'reason', $start) : null,
                'ticketsByStatus' => $hasTickets ? $this->groupCount('moderation_tickets', 'status', $start) : null,
                'ticketsByCategory' => $hasTickets ? $this->groupCount('moderation_tickets', 'category', $start) : null,
                'tradeByRating' => $hasTrade ? $this->tradeMix($start) : null,
                'topTags' => $this->topTags($schema, 8),
            ],
        ];
    }

    /**
     * @param callable(Builder):void|null $scope
     * @return array{total:int,period:int,prev:int,delta:float|null}
     */
    protected function kpi(int $total, int $period, int $prev): array
    {
        $delta = null;
        if ($prev > 0) {
            $delta = round((($period - $prev) / $prev) * 100, 1);
        } elseif ($period > 0) {
            $delta = 100.0;
        } else {
            $delta = 0.0;
        }

        return [
            'total' => $total,
            'period' => $period,
            'prev' => $prev,
            'delta' => $delta,
        ];
    }

    /**
     * @param callable(Builder):void|null $scope
     */
    protected function lifetime(string $table, ?callable $scope = null): int
    {
        $q = $this->db->table($table);
        if ($scope) {
            $scope($q);
        }

        return (int) $q->count();
    }

    /**
     * @param callable(Builder):void|null $scope
     */
    protected function countBetween(string $table, string $column, Carbon $start, ?Carbon $end = null, ?callable $scope = null): int
    {
        $q = $this->db->table($table)->where($column, '>=', $start);
        if ($end) {
            $q->where($column, '<=', $end);
        }
        if ($scope) {
            $scope($q);
        }

        return (int) $q->count();
    }

    /**
     * @param string[] $labels
     * @param callable(Builder):void|null $scope
     * @return int[]
     */
    protected function series(string $table, string $column, Carbon $start, array $labels, ?callable $scope = null): array
    {
        $q = $this->db->table($table)->where($column, '>=', $start);
        if ($scope) {
            $scope($q);
        }

        $map = $q
            ->selectRaw('DATE('.$column.') as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $out = [];
        foreach ($labels as $day) {
            $out[] = (int) ($map[$day] ?? 0);
        }

        return $out;
    }

    /**
     * @return array<string, int>
     */
    protected function groupCount(string $table, string $column, Carbon $start): array
    {
        $rows = $this->db->table($table)
            ->where('created_at', '>=', $start)
            ->selectRaw($column.' as key_name, COUNT(*) as total')
            ->groupBy($column)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $key = (string) ($row->key_name ?? 'unknown');
            $out[$key] = (int) $row->total;
        }

        return $out;
    }

    /**
     * @return array{positive:int,neutral:int,negative:int}
     */
    protected function tradeMix(Carbon $start): array
    {
        $rows = $this->db->table('trade_feedbacks')
            ->where('created_at', '>=', $start)
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        return [
            'positive' => (int) ($rows[1] ?? $rows['1'] ?? 0),
            'neutral' => (int) ($rows[0] ?? $rows['0'] ?? 0),
            'negative' => (int) ($rows[-1] ?? $rows['-1'] ?? 0),
        ];
    }

    /**
     * @return list<array{id:int|string,name:string,slug:string,count:int}>
     */
    protected function topTags(SchemaBuilder $schema, int $limit): array
    {
        if (! $schema->hasTable('tags')) {
            return [];
        }

        $rows = $this->db->table('tags')
            ->orderByDesc('discussion_count')
            ->limit($limit)
            ->get(['id', 'name', 'slug', 'discussion_count']);

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => $row->id,
                'name' => (string) $row->name,
                'slug' => (string) $row->slug,
                'count' => (int) $row->discussion_count,
            ];
        }

        return $out;
    }
}
