import Component from 'flarum/common/Component';
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { chartDefaults } from '../utils';

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

export default class ChartPanel extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.chart = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this._sig = this.attrs.signature;
    this.renderChart();
  }

  onupdate() {
    if (this._sig !== this.attrs.signature) {
      this._sig = this.attrs.signature;
      this.renderChart();
    }
  }

  onremove() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  renderChart() {
    const canvas = this.element && this.element.querySelector('canvas');
    if (!canvas || !this.attrs.config) {
      return;
    }

    const theme = chartDefaults();
    if (this.chart) {
      this.chart.destroy();
    }

    const config = this.attrs.config;
    const options = Object.assign(
      {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: theme.color, boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#dfe2e5',
            bodyColor: '#959da5',
            borderWidth: 0,
          },
        },
        scales: config.type === 'doughnut' || config.type === 'pie'
          ? undefined
          : {
              x: {
                ticks: { color: theme.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                grid: { color: theme.borderColor },
              },
              y: {
                beginAtZero: true,
                ticks: { color: theme.muted, precision: 0 },
                grid: { color: theme.borderColor },
              },
            },
      },
      config.options || {}
    );

    this.chart = new Chart(canvas.getContext('2d'), {
      type: config.type || 'line',
      data: config.data,
      options,
    });
  }

  view() {
    return (
      <div className={'PrmAnalytics-chartPanel' + (this.attrs.className ? ' ' + this.attrs.className : '')}>
        {this.attrs.title ? <div className="PrmAnalytics-chartTitle">{this.attrs.title}</div> : null}
        <div className="PrmAnalytics-chartCanvasWrap">
          <canvas />
        </div>
      </div>
    );
  }
}
