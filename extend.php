<?php

namespace Prm\Analytics;

use Flarum\Extend;
use Prm\Analytics\Api\ShowAnalyticsController;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->get('/prm-analytics', 'prm-analytics.show', ShowAnalyticsController::class),
];
