import DashboardWidget from 'flarum/admin/components/DashboardWidget';
import LinkButton from 'flarum/common/components/LinkButton';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/admin/app';
import { t, formatNumber, deltaClass, deltaLabel } from '../utils';

export default class AnalyticsMiniWidget extends DashboardWidget {
  oninit(vnode) {
    super.oninit(vnode);
    this.loading = true;
    this.data = null;
    app
      .request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/prm-analytics',
        params: { range: '7d' },
      })
      .then((data) => {
        this.data = data;
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        m.redraw();
      });
  }

  className() {
    return 'PrmAnalyticsMiniWidget';
  }

  content() {
    if (this.loading) {
      return <LoadingIndicator />;
    }
    if (!this.data) {
      return <div className="PrmAnalytics-error">{t('error')}</div>;
    }

    const k = this.data.kpis || {};
    const items = [
      ['users', k.users],
      ['discussions', k.discussions],
      ['posts', k.posts],
      ['reports', k.reports],
    ].filter((row) => row[1]);

    return (
      <div>
        <div className="PrmAnalyticsMiniWidget-head">
          <strong>{t('title')}</strong>
          <LinkButton className="Button Button--link" href={app.route('extension', { id: 'prm-analytics' })}>
            {t('range.7d')}
          </LinkButton>
        </div>
        <div className="PrmAnalyticsMiniWidget-grid">
          {items.map(([key, kpi]) => (
            <div className="PrmAnalyticsMiniWidget-item" key={key}>
              <div className="PrmAnalytics-kpiLabel">{t('kpis.' + key)}</div>
              <div className="PrmAnalyticsMiniWidget-value">{formatNumber(kpi.period)}</div>
              <div className={'StatisticsWidget-change ' + deltaClass(kpi.delta)}>{deltaLabel(kpi.delta)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
