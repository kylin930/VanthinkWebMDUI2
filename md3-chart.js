const MD3Chart = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, v);
    }
    return el;
  }

  function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n).toString();
  }

  function staggerDelay(index, total, baseDelay = 0) {
    return baseDelay + (index / total) * 200;
  }

  function drawAxis(svg, opts) {
    const { x, y, width, height, labels, yMax, yTicks = 4 } = opts;
    const axisGroup = createSvgEl('g', { class: 'md3-chart-axis' });
    const gridGroup = createSvgEl('g', { class: 'md3-chart-grid' });

    const yAxis = createSvgEl('line', { x1: x, y1: y, x2: x, y2: y + height });
    const xAxis = createSvgEl('line', { x1: x, y1: y + height, x2: x + width, y2: y + height });
    axisGroup.appendChild(yAxis);
    axisGroup.appendChild(xAxis);

    for (let i = 0; i <= yTicks; i++) {
      const ratio = i / yTicks;
      const yPos = y + height - ratio * height;
      const value = ratio * yMax;
      const gridLine = createSvgEl('line', { x1: x, y1: yPos, x2: x + width, y2: yPos });
      gridGroup.appendChild(gridLine);
      const label = createSvgEl('text', { x: x - 8, y: yPos + 4, 'text-anchor': 'end' });
      label.textContent = formatNumber(value);
      axisGroup.appendChild(label);
    }

    if (labels && labels.length) {
      const step = width / labels.length;
      labels.forEach((label, i) => {
        const xPos = x + step * i + step / 2;
        const text = createSvgEl('text', { x: xPos, y: y + height + 18, 'text-anchor': 'middle' });
        text.textContent = label;
        axisGroup.appendChild(text);
      });
    }

    svg.appendChild(gridGroup);
    svg.appendChild(axisGroup);
    return { step: labels ? width / labels.length : 0 };
  }

  function createTooltip(container) {
    const tip = document.createElement('div');
    tip.className = 'md3-chart-tooltip';
    container.appendChild(tip);
    return tip;
  }

  function showTooltip(tip, container, x, y, html) {
    tip.innerHTML = html;
    tip.classList.add('md3-visible');
    const rect = container.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = x - tipRect.width / 2;
    let top = y - tipRect.height - 8;
    if (left < 0) left = 0;
    if (left + tipRect.width > rect.width) left = rect.width - tipRect.width;
    if (top < 0) top = y + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTooltip(tip) {
    tip.classList.remove('md3-visible');
  }

  function barChart(container, opts) {
    const {
      title = '',
      subtitle = '',
      data = [],
      labels = [],
      height = 240,
      showLegend = true,
      legend = []
    } = opts;

    container.innerHTML = '';
    container.classList.add('md3-chart-container');

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

    const padding = { top: 16, right: 16, bottom: 36, left: 48 };
    const svgWidth = 500;
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = createSvgEl('svg', {
      class: 'md3-chart-svg',
      viewBox: `0 0 ${svgWidth} ${height}`,
      preserveAspectRatio: 'xMidYMid meet'
    });
    container.appendChild(svg);

    const maxValue = Math.max(...data.map(d => d.value), 1) * 1.15;
    const axisInfo = drawAxis(svg, {
      x: padding.left,
      y: padding.top,
      width: chartWidth,
      height: chartHeight,
      labels,
      yMax: maxValue,
      yTicks: 4
    });

    const tooltip = createTooltip(container);
    const barGroup = createSvgEl('g');

    const barWidth = Math.min(axisInfo.step * 0.6, 36);
    const seriesColors = ['md3-chart-bar', 'md3-chart-bar--secondary', 'md3-chart-bar--tertiary'];

    data.forEach((item, i) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding.left + axisInfo.step * i + axisInfo.step / 2 - barWidth / 2;
      const y = padding.top + chartHeight - barHeight;

      const rect = createSvgEl('rect', {
        class: seriesColors[i % 3],
        x: x,
        y: padding.top + chartHeight,
        width: barWidth,
        height: 0
      });

      rect.addEventListener('mouseenter', (e) => {
        const rect2 = container.getBoundingClientRect();
        showTooltip(tooltip, container,
          e.clientX - rect2.left,
          e.clientY - rect2.top,
          `<strong>${labels[i] || item.label || ''}</strong><br>${item.value}`
        );
      });
      rect.addEventListener('mousemove', (e) => {
        const rect2 = container.getBoundingClientRect();
        showTooltip(tooltip, container,
          e.clientX - rect2.left,
          e.clientY - rect2.top,
          `<strong>${labels[i] || item.label || ''}</strong><br>${item.value}`
        );
      });
      rect.addEventListener('mouseleave', () => hideTooltip(tooltip));

      barGroup.appendChild(rect);

      setTimeout(() => {
        rect.style.transition = `y 700ms cubic-bezier(0.2, 0, 0, 1), height 700ms cubic-bezier(0.2, 0, 0, 1), opacity 500ms cubic-bezier(0.2, 0, 0, 1)`;
        requestAnimationFrame(() => {
          rect.setAttribute('y', y);
          rect.setAttribute('height', barHeight);
          rect.classList.add('md3-animate-in');
        });
      }, staggerDelay(i, data.length, 100));
    });

    svg.appendChild(barGroup);

    if (showLegend && legend.length) {
      const legendEl = document.createElement('div');
      legendEl.className = 'md3-chart-legend';
      legend.forEach((item, i) => {
        const legItem = document.createElement('div');
        legItem.className = 'md3-chart-legend-item';
        const color = document.createElement('div');
        color.className = 'md3-chart-legend-color';
        const cls = ['md3-chart-bar', 'md3-chart-bar--secondary', 'md3-chart-bar--tertiary'][i % 3];
        color.style.background = getComputedStyle(document.documentElement)
          .getPropertyValue(cls === 'md3-chart-bar' ? '--md3-chart-primary' :
            cls === 'md3-chart-bar--secondary' ? '--md3-chart-secondary' : '--md3-chart-tertiary')
          || '#6750a4';
        legItem.appendChild(color);
        legItem.appendChild(document.createTextNode(item));
        legendEl.appendChild(legItem);
      });
      container.appendChild(legendEl);
    }
  }

  function lineChart(container, opts) {
    const {
      title = '',
      subtitle = '',
      datasets = [],
      labels = [],
      height = 240,
      showArea = true,
      showLegend = true
    } = opts;

    container.innerHTML = '';
    container.classList.add('md3-chart-container');

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

    const padding = { top: 16, right: 16, bottom: 36, left: 48 };
    const svgWidth = 500;
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = createSvgEl('svg', {
      class: 'md3-chart-svg',
      viewBox: `0 0 ${svgWidth} ${height}`,
      preserveAspectRatio: 'xMidYMid meet'
    });
    container.appendChild(svg);

    const defs = createSvgEl('defs');
    const grad = createSvgEl('linearGradient', {
      id: 'md3-chart-area-gradient',
      x1: '0', y1: '0', x2: '0', y2: '1'
    });
    grad.appendChild(createSvgEl('stop', { offset: '0%', 'stop-color': 'var(--md3-chart-primary)', 'stop-opacity': '0.3' }));
    grad.appendChild(createSvgEl('stop', { offset: '100%', 'stop-color': 'var(--md3-chart-primary)', 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    let allValues = [];
    datasets.forEach(ds => ds.data.forEach(v => allValues.push(v)));
    const maxValue = Math.max(...allValues, 1) * 1.15;

    drawAxis(svg, {
      x: padding.left,
      y: padding.top,
      width: chartWidth,
      height: chartHeight,
      labels,
      yMax: maxValue,
      yTicks: 4
    });

    const tooltip = createTooltip(container);
    const step = chartWidth / Math.max(labels.length - 1, 1);

    const colorVars = ['--md3-chart-primary', '--md3-chart-secondary', '--md3-chart-tertiary'];

    datasets.forEach((ds, dsIdx) => {
      const colorVar = colorVars[dsIdx % 3];
      const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar) || '#6750a4';

      const points = ds.data.map((v, i) => {
        const x = padding.left + step * i;
        const y = padding.top + chartHeight - (v / maxValue) * chartHeight;
        return { x, y, value: v, label: labels[i] };
      });

      if (showArea && dsIdx === 0) {
        const areaPath = `M${points[0].x},${padding.top + chartHeight} ` +
          points.map(p => `L${p.x},${p.y}`).join(' ') +
          ` L${points[points.length - 1].x},${padding.top + chartHeight} Z`;
        const area = createSvgEl('path', {
          class: 'md3-chart-area',
          d: areaPath
        });
        svg.appendChild(area);
        setTimeout(() => area.classList.add('md3-animate-in'), 200);
      }

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const line = createSvgEl('path', {
        class: 'md3-chart-line',
        d: linePath,
        stroke: color.trim() || undefined
      });
      svg.appendChild(line);

      const dotGroup = createSvgEl('g');
      points.forEach((p, i) => {
        const dot = createSvgEl('circle', {
          class: 'md3-chart-dot',
          cx: p.x,
          cy: p.y,
          stroke: color.trim() || undefined
        });
        dot.addEventListener('mouseenter', (e) => {
          const rect = container.getBoundingClientRect();
          showTooltip(tooltip, container,
            e.clientX - rect.left,
            e.clientY - rect.top,
            `<strong>${p.label}</strong><br>${ds.label ? ds.label + ': ' : ''}${p.value}`
          );
        });
        dot.addEventListener('mousemove', (e) => {
          const rect = container.getBoundingClientRect();
          showTooltip(tooltip, container,
            e.clientX - rect.left,
            e.clientY - rect.top,
            `<strong>${p.label}</strong><br>${ds.label ? ds.label + ': ' : ''}${p.value}`
          );
        });
        dot.addEventListener('mouseleave', () => hideTooltip(tooltip));
        dotGroup.appendChild(dot);
        setTimeout(() => dot.classList.add('md3-animate-in'), 400 + i * 60);
      });
      svg.appendChild(dotGroup);

      setTimeout(() => line.classList.add('md3-animate-in'), 300);
    });

    if (showLegend && datasets.length > 1) {
      const legendEl = document.createElement('div');
      legendEl.className = 'md3-chart-legend';
      datasets.forEach((ds, i) => {
        const colorVar = colorVars[i % 3];
        const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar) || '#6750a4';
        const legItem = document.createElement('div');
        legItem.className = 'md3-chart-legend-item';
        const c = document.createElement('div');
        c.className = 'md3-chart-legend-color';
        c.style.background = color.trim();
        legItem.appendChild(c);
        legItem.appendChild(document.createTextNode(ds.label || `系列 ${i + 1}`));
        legendEl.appendChild(legItem);
      });
      container.appendChild(legendEl);
    }
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
      setTimeout(() => el.classList.add('md3-animate-in'), i * 80);
    });

    container.appendChild(grid);
  }

  return { barChart, lineChart, statCards, formatNumber };
})();

if (typeof window !== 'undefined') {
  window.MD3Chart = MD3Chart;
}
