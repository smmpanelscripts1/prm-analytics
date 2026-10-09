import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import AnalyticsDashboard from './AnalyticsDashboard';

export default class AnalyticsPage extends ExtensionPage {
  content() {
    return (
      <div className="PrmAnalyticsPage">
        <div className="container">
          <AnalyticsDashboard />
        </div>
      </div>
    );
  }
}
