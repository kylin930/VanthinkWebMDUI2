const MD3Chart = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    }
    return el;
  }

  function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n).toString();
  }

  function sampleLabels(labels, maxCount = 8) {
    if (labels.length <= maxCount) return { labels, indices: labels.map((_, i) => i) };
    const step = Math.ceil(labels.length / maxCount);
    const result = [];
    const indices = [];
    for (let i = 0; i < labels.length; i += step) {
      result.push(labels[i]);
      indices.push(i);
    }
    if (indices[indices.length - 1] !== labels.length - 1) {
      result.push(labels[labels.length - 1]);
      indices.push(labels.length - 1);
    }
    return { labels: result, indices };
  }

  function getPrimaryColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--mdui-color-primary').trim() || '#6750a4';
  }

  function getSecondaryColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--mdui-color-secondary').trim() || '#625b71';
  }

  function getSurfaceVariant() {
    return getComputedStyle(document.documentElement).getPropertyValue('--mdui-color-surface-variant').trim() || '#e7e0ec';
  }

  function barChart(container, opts) {
    const { title = '', subtitle = '', data = [], labels = [], height = 260 } = opts;

    container.innerHTML = '';
    container.className = 'md3-chart-container';

    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'md3-chart-title';
      titleEl.textContent = title;
      container.appendChild(titleEl);
    }
    if (subtitle) {
      const subEl = document.createElement('div');
      subEl.className = 'md3-chart-subtitle';
      subEl.textContent = subtitle;
      container.appendChild(subEl);
    }

    const padding = { top: 12, right: 16, bottom: 40, left: 48 };
    const svgWidth = 560;
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = createSvgEl('svg', {
      width: '100%',
      height: height,
      viewBox: `0 0 ${svgWidth} ${height}`
    });
    container.appendChild(svg);

    const values = data.map(d => typeof d === 'object' ? d.value : d);
    const maxValue = Math.max(...values, 1) * 1.1;

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const ratio = i / yTicks;
      const yPos = padding.top + chartHeight - ratio * chartHeight;
      const value = ratio * maxValue;
      const gridLine = createSvgEl('line', {
        x1: padding.left, y1: yPos, x2: padding.left + chartWidth, y2: yPos,
        stroke: getSurfaceVariant(), 'stroke-width': 1
      });
      svg.appendChild(gridLine);
      const label = createSvgEl('text', {
        x: padding.left - 8, y: yPos + 4, 'text-anchor': 'end',
        'font-size': 11, fill: '#666'
      });
      label.textContent = formatNumber(value);
      svg.appendChild(label);
    }

    const xAxis = createSvgEl('line', {
      x1: padding.left, y1: padding.top + chartHeight,
      x2: padding.left + chartWidth, y2: padding.top + chartHeight,
      stroke: '#ccc', 'stroke-width': 1
    });
    svg.appendChild(xAxis);

    const { labels: displayLabels, indices: labelIndices } = sampleLabels(labels, 8);
    displayLabels.forEach((label, idx) => {
      const i = labelIndices[idx];
      const step = chartWidth / labels.length;
      const xPos = padding.left + step * i + step / 2;
      const text = createSvgEl('text', {
        x: xPos, y: padding.top + chartHeight + 20, 'text-anchor': 'middle',
        'font-size': 11, fill: '#666'
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    const primaryColor = getPrimaryColor();
    const barStep = chartWidth / labels.length;
    const barWidth = Math.max(2, barStep * 0.65);

    values.forEach((value, i) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding.left + barStep * i + (barStep - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;

      const rect = createSvgEl('rect', {
        x: x, y: y, width: barWidth, height: Math.max(0, barHeight),
        fill: primaryColor, rx: 4, ry: 4
      });
      svg.appendChild(rect);
    });
  }

  function lineChart(container, opts) {
    const { title = '', subtitle = '', datasets = [], labels = [], height = 240, showArea = true } = opts;

    container.innerHTML = '';
    container.className = 'md3-chart-container';

    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'md3-chart-title';
      titleEl.textContent = title;
      container.appendChild(titleEl);
    }
    if (subtitle) {
      const subEl = document.createElement('div');
      subEl.className = 'md3-chart-subtitle';
      subEl.textContent = subtitle;
      container.appendChild(subEl);
    }

    const padding = { top: 12, right: 16, bottom: 40, left: 48 };
    const svgWidth = 560;
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = createSvgEl('svg', {
      width: '100%',
      height: height,
      viewBox: `0 0 ${svgWidth} ${height}`
    });
    container.appendChild(svg);

    let allValues = [];
    datasets.forEach(ds => ds.data.forEach(v => allValues.push(v)));
    const maxValue = Math.max(...allValues, 1) * 1.1;

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const ratio = i / yTicks;
      const yPos = padding.top + chartHeight - ratio * chartHeight;
      const value = ratio * maxValue;
      const gridLine = createSvgEl('line', {
        x1: padding.left, y1: yPos, x2: padding.left + chartWidth, y2: yPos,
        stroke: getSurfaceVariant(), 'stroke-width': 1
      });
      svg.appendChild(gridLine);
      const label = createSvgEl('text', {
        x: padding.left - 8, y: yPos + 4, 'text-anchor': 'end',
        'font-size': 11, fill: '#666'
      });
      label.textContent = formatNumber(value);
      svg.appendChild(label);
    }

    const xAxis = createSvgEl('line', {
      x1: padding.left, y1: padding.top + chartHeight,
      x2: padding.left + chartWidth, y2: padding.top + chartHeight,
      stroke: '#ccc', 'stroke-width': 1
    });
    svg.appendChild(xAxis);

    const { labels: displayLabels, indices: labelIndices } = sampleLabels(labels, 8);
    displayLabels.forEach((label, idx) => {
      const i = labelIndices[idx];
      const step = chartWidth / Math.max(labels.length - 1, 1);
      const xPos = padding.left + step * i;
      const text = createSvgEl('text', {
        x: xPos, y: padding.top + chartHeight + 20, 'text-anchor': 'middle',
        'font-size': 11, fill: '#666'
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    const colors = [getPrimaryColor(), getSecondaryColor(), '#7d5260'];
    const step = chartWidth / Math.max(labels.length - 1, 1);

    datasets.forEach((ds, dsIdx) => {
      const color = colors[dsIdx % colors.length];
      const points = ds.data.map((v, i) => ({
        x: padding.left + step * i,
        y: padding.top + chartHeight - (v / maxValue) * chartHeight
      }));

      if (showArea && dsIdx === 0) {
        const areaPath = `M${points[0].x},${padding.top + chartHeight} ` +
          points.map(p => `L${p.x},${p.y}`).join(' ') +
          ` L${points[points.length - 1].x},${padding.top + chartHeight} Z`;
        const area = createSvgEl('path', {
          d: areaPath,
          fill: color,
          'fill-opacity': 0.15
        });
        svg.appendChild(area);
      }

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const line = createSvgEl('path', {
        d: linePath,
        fill: 'none',
        stroke: color,
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      });
      svg.appendChild(line);

      if (points.length <= 31) {
        points.forEach(p => {
          const dot = createSvgEl('circle', {
            cx: p.x, cy: p.y, r: 3.5,
            fill: '#fff', stroke: color, 'stroke-width': 2
          });
          svg.appendChild(dot);
        });
      }
    });
  }

  function statCards(container, cards) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'md3-stat-cards';

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'md3-stat-card';

      if (card.icon) {
        const ic = document.createElement('div');
        ic.className = 'md3-stat-card-icon';
        ic.textContent = card.icon;
        el.appendChild(ic);
      }

      const label = document.createElement('div');
      label.className = 'md3-stat-card-label';
      label.textContent = card.label;
      el.appendChild(label);

      const value = document.createElement('div');
      value.className = 'md3-stat-card-value';
      value.textContent = card.value;
      el.appendChild(value);

      if (card.sub) {
        const sub = document.createElement('div');
        sub.className = 'md3-stat-card-sub';
        sub.textContent = card.sub;
        el.appendChild(sub);
      }

      grid.appendChild(el);
      setTimeout(() => el.classList.add('md3-animate-in'), i * 60);
    });

    container.appendChild(grid);
  }

  return { barChart, lineChart, statCards, formatNumber };
})();

if (typeof window !== 'undefined') {
  window.MD3Chart = MD3Chart;
}
