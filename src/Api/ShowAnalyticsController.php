<?php

namespace Prm\Analytics\Api;

use Flarum\Http\RequestUtil;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\ConnectionInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Prm\Analytics\AnalyticsService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ShowAnalyticsController implements RequestHandlerInterface
{
    public function __construct(
        protected ConnectionInterface $db,
        protected CacheRepository $cache
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $params = $request->getQueryParams();
        $range = (string) ($params['range'] ?? '30d');
        if (! in_array($range, ['7d', '30d', '90d'], true)) {
            $range = '30d';
        }

        $payload = $this->cache->remember(
            'prm-analytics.'.$range,
            60,
            fn () => (new AnalyticsService($this->db))->build($range)
        );

        return new JsonResponse($payload);
    }
}
