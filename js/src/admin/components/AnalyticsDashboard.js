import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/admin/app';
import ChartPanel from './ChartPanel';
import { t, formatNumber, deltaClass, deltaLabel, seriesColors, doughnutColors } from '../utils';

function kpiCard(key, kpi, opts = {}) {
  if (opts.backlog) {
    if (opts.value == null) return null;
    return (
      <div className="PrmAnalytics-kpi">
        <div className="PrmAnalytics-kpiLabel">{t('kpis.' + key)}</div>
        <div className="PrmAnalytics-kpiValue">{formatNumber(opts.value)}</div>
        <div className="PrmAnalytics-kpiMeta">{t('kpis.now')}</div>
      </div>
    );
  }

  if (!kpi) return null;

  return (
    <div className="PrmAnalytics-kpi">
      <div className="PrmAnalytics-kpiLabel">{t('kpis.' + key)}</div>
      <div className="PrmAnalytics-kpiValue">{formatNumber(kpi.total)}</div>
      <div className="PrmAnalytics-kpiMeta">
        <span>+{formatNumber(kpi.period)}</span>
        <span className={'StatisticsWidget-change ' + deltaClass(kpi.delta)}>{deltaLabel(kpi.delta)}</span>
        <span className="PrmAnalytics-kpiHint">{t('kpis.vs_prev')}</span>
      </div>
    </div>
  );
}

function lineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color.border,
    backgroundColor: color.fill,
    fill: true,
    tension: 0.3,
    pointRadius: 0,
    borderWidth: 2,
  };
}

export default class AnalyticsDashboard extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.range = '30d';
    this.loading = true;
    this.error = false;
    this.data = null;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = false;
    m.redraw();

    app
      .request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/prm-analytics',
        params: { range: this.range },
      })
      .then((data) => {
        this.data = data;
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.error = true;
        this.loading = false;
        m.redraw();
      });
  }

  setRange(range) {
    if (this.range === range) return;
    this.range = range;
    this.load();
  }

  view() {
    return (
      <div className="PrmAnalytics">
        <div className="PrmAnalytics-header">
          <div>
            <h2 className="PrmAnalytics-title">{t('title')}</h2>
            <p className="PrmAnalytics-subtitle">{t('subtitle')}</p>
          </div>
          <div className="PrmAnalytics-controls">
            <div className="PrmAnalytics-ranges">
              {['7d', '30d', '90d'].map((r) => (
                <Button
                  className={'Button Button--rounded' + (this.range === r ? ' Button--primary' : '')}
                  onclick={() => this.setRange(r)}
                >
                  {t('range.' + r)}
                </Button>
              ))}
            </div>
            <Button className="Button" icon="fas fa-sync" onclick={() => this.load()} loading={this.loading}>
              {t('refresh')}
            </Button>
          </div>
        </div>

        {this.loading && !this.data ? <LoadingIndicator /> : null}
        {this.error ? <div className="PrmAnalytics-error">{t('error')}</div> : null}
        {this.data ? this.body() : null}
      </div>
    );
  }

  body() {
    const d = this.data;
    const k = d.kpis || {};
    const s = d.series || {};
    const b = d.breakdowns || {};
    const sig = this.range + '|' + (d.generatedAt || '');
    const colors = seriesColors();

    return [
      <div className="PrmAnalytics-kpis">
        {kpiCard('users', k.users)}
        {kpiCard('discussions', k.discussions)}
        {kpiCard('posts', k.posts)}
        {kpiCard('likes', k.likes)}
        {kpiCard('reports', k.reports)}
        {kpiCard('tickets', k.tickets)}
        {kpiCard('warnings', k.warnings)}
        {kpiCard('trade', k.trade)}
        {kpiCard('pending_reports', null, { backlog: true, value: k.pendingReports })}
        {kpiCard('open_tickets', null, { backlog: true, value: k.openTickets })}
      </div>,

      <div className="PrmAnalytics-grid">
        <ChartPanel
          className="PrmAnalytics-span2"
          title={t('charts.growth')}
          signature={sig + '-growth'}
          config={{
            type: 'line',
            data: {
              labels: s.labels,
              datasets: [
                lineDataset(t('series.users'), s.users, colors[0]),
                lineDataset(t('series.discussions'), s.discussions, colors[1]),
                lineDataset(t('series.posts'), s.posts, colors[2]),
              ],
            },
          }}
        />

        <ChartPanel
          title={t('charts.engagement')}
          signature={sig + '-likes'}
          config={{
            type: 'bar',
            data: {
              labels: s.labels,
              datasets: [
                {
                  label: s.likes ? t('series.likes') : t('series.posts'),
                  data: s.likes || s.posts || [],
                  backgroundColor: colors[0].border,
                  borderRadius: 2,
                },
              ],
            },
            options: { plugins: { legend: { display: false } } },
          }}
        />

        <ChartPanel
          title={t('charts.activity')}
          signature={sig + '-activity'}
          config={{
            type: 'doughnut',
            data: {
              labels: [t('series.discussions'), t('series.posts'), t('series.likes')],
              datasets: [
                {
                  data: [
                    (k.discussions && k.discussions.period) || 0,
                    (k.posts && k.posts.period) || 0,
                    (k.likes && k.likes.period) || 0,
                  ],
                  backgroundColor: doughnutColors(3),
                  borderWidth: 0,
                },
              ],
            },
          }}
        />

        {d.available && d.available.moderation ? (
          <ChartPanel
            className="PrmAnalytics-span2"
            title={t('charts.moderation')}
            signature={sig + '-mod'}
            config={{
              type: 'line',
              data: {
                labels: s.labels,
                datasets: [
                  s.reports && lineDataset(t('series.reports'), s.reports, colors[0]),
                  s.tickets && lineDataset(t('series.tickets'), s.tickets, colors[1]),
                  s.warnings && lineDataset(t('series.warnings'), s.warnings, colors[2]),
                ].filter(Boolean),
              },
            }}
          />
        ) : (
          <div className="PrmAnalytics-note">{t('soft.moderation_off')}</div>
        )}

        {this.doughnut('reports_status', b.reportsByStatus, sig + '-rs')}
        {this.doughnut('reports_reason', b.reportsByReason, sig + '-rr')}
        {this.doughnut('tickets_status', b.ticketsByStatus, sig + '-ts')}
        {this.doughnut('tickets_category', b.ticketsByCategory, sig + '-tc')}

        {s.trade ? (
          <ChartPanel
            title={t('charts.trade')}
            signature={sig + '-trade'}
            config={{
              type: 'bar',
              data: {
                labels: s.labels,
                datasets: [
                  {
                    label: t('series.trade'),
                    data: s.trade,
                    backgroundColor: colors[0].border,
                    borderRadius: 2,
                  },
                ],
              },
              options: { plugins: { legend: { display: false } } },
            }}
          />
        ) : null}

        {b.tradeByRating ? (
          <ChartPanel
            title={t('charts.trade_mix')}
            signature={sig + '-tmix'}
            config={{
              type: 'doughnut',
              data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [
                  {
                    data: [b.tradeByRating.positive, b.tradeByRating.neutral, b.tradeByRating.negative],
                    backgroundColor: doughnutColors(3),
                    borderWidth: 0,
                  },
                ],
              },
            }}
          />
        ) : null}

        {b.topTags && b.topTags.length ? (
          <ChartPanel
            className="PrmAnalytics-span2"
            title={t('charts.top_tags')}
            signature={sig + '-tags'}
            config={{
              type: 'bar',
              data: {
                labels: b.topTags.map((tag) => tag.name),
                datasets: [
                  {
                    label: t('kpis.discussions'),
                    data: b.topTags.map((tag) => tag.count),
                    backgroundColor: colors[0].border,
                    borderRadius: 2,
                  },
                ],
              },
              options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
              },
            }}
          />
        ) : null}
      </div>,
    ];
  }

  doughnut(titleKey, map, signature) {
    if (!map || !Object.keys(map).length) return null;
    const labels = Object.keys(map);
    const values = labels.map((k) => map[k]);

    return (
      <ChartPanel
        title={t('charts.' + titleKey)}
        signature={signature}
        config={{
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: doughnutColors(labels.length),
                borderWidth: 0,
              },
            ],
          },
        }}
      />
    );
  }
}
