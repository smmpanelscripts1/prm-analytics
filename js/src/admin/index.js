import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';
import DashboardPage from 'flarum/admin/components/DashboardPage';
import AnalyticsMiniWidget from './components/AnalyticsMiniWidget';

export { default as extend } from './extend';

app.initializers.add(
  'prm-analytics',
  () => {
    // Run after flarum-statistics so we can replace its dashboard widget.
    extend(DashboardPage.prototype, 'availableWidgets', function (widgets) {
      if (widgets.has('statistics')) {
        widgets.remove('statistics');
      }
      widgets.add('prm-analytics', <AnalyticsMiniWidget />, 20);
    });
  },
  50
);
