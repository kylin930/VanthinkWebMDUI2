const StatsModule = (() => {
  let currentStudentId = null;

  async function getStudentId() {
    if (currentStudentId) return currentStudentId;
    try {
      const res = await fetchWithAuth('https://api.wxzxzj.com/api/userinfo/getAccount');
      if (!res.ok) return null;
      const data = await res.json();
      currentStudentId = data?.data?.id;
      return currentStudentId;
    } catch (e) {
      console.warn('获取学生ID失败:', e);
      return null;
    }
  }

  function safeGet(obj, path, def = null) {
    return path.split('.').reduce((acc, key) => {
      if (acc == null) return def;
      return acc[key] !== undefined ? acc[key] : def;
    }, obj);
  }

  async function fetchReport(studentId, year, month) {
    try {
      const res = await postWithAuth(
        'https://api.wxzxzj.com/api/vanclass/getVanclassStudentReport',
        { student_id: studentId, year, month }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('获取统计数据失败:', e);
      throw e;
    }
  }

  function parseReport(rawData, year, month) {
    const d = rawData?.data || rawData || {};

    const practiceTotal = safeGet(d, 'practice.count', 0);
    const practiceAvg = safeGet(d, 'practice.avg', 0);
    const practiceMonthAvg = safeGet(d, 'practice.month_avg', 0);

    const exerciseTotal = safeGet(d, 'exercise.count', 0);
    const exerciseAvg = safeGet(d, 'exercise.avg', 0);
    const exerciseMonthAvg = safeGet(d, 'exercise.month_avg', 0);

    const timeCount = safeGet(d, 'time.count', 0);
    const timeAvg = safeGet(d, 'time.avg', 0);
    const timeMonthAvg = safeGet(d, 'time.month_avg', 0);

    const photoCount = safeGet(d, 'photo_homework.count', 0);
    const photoAvg = safeGet(d, 'photo_homework.avg', 0);
    const photoMonthAvg = safeGet(d, 'photo_homework.month_avg', 0);

    const plStartTime = safeGet(d, 'pl_data.start_time', '');
    const plTotalTime = safeGet(d, 'pl_data.total_time', 0);
    const plAvgTime = safeGet(d, 'pl_data.avg_time', 0);

    const dailyList = safeGet(d, 'list', []);
    const studentName = safeGet(d, 'student_name', '');

    return {
      practice: { total: practiceTotal, avgMonth: practiceAvg, currentMonth: practiceMonthAvg },
      correct: { total: exerciseTotal, avgMonth: exerciseAvg, currentMonth: exerciseMonthAvg },
      days: { total: timeCount, avgMinutesPerDay: timeAvg, avgMinutesCurrentMonth: timeMonthAvg },
      photo: { total: photoCount, avgMonth: photoAvg, currentMonth: photoMonthAvg },
      ear: { startDate: plStartTime, totalMinutes: plTotalTime, avgMinutesPerDay: plAvgTime },
      dailyList,
      studentName
    };
  }

  function getDailyLabels(dailyList) {
    return dailyList.map(item => {
      const parts = item.day.split('-');
      return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    });
  }

  function renderStats(report, year, month) {
    const content = document.getElementById('statsContent');
    if (!content) return;
    content.innerHTML = '';

    const statCardsContainer = document.createElement('div');
    content.appendChild(statCardsContainer);

    const monthLabel = `${year}年${month}月`;

    MD3Chart.statCards(statCardsContainer, [
      {
        icon: '📚',
        label: '总练习次数',
        value: report.practice.total.toLocaleString(),
        sub: `月均 ${report.practice.avgMonth} 次 · ${monthLabel} ${report.practice.currentMonth} 次`
      },
      {
        icon: '✅',
        label: '总答对题数',
        value: report.correct.total.toLocaleString(),
        sub: `月均 ${report.correct.avgMonth} 题 · ${monthLabel} ${report.correct.currentMonth} 题`
      },
      {
        icon: '📅',
        label: '练习天数',
        value: report.days.total.toLocaleString() + ' 天',
        sub: `日均 ${report.days.avgMinutesPerDay} 分钟 · ${monthLabel} 均 ${report.days.avgMinutesCurrentMonth} 分钟`
      },
      {
        icon: '📷',
        label: '拍照练习',
        value: report.photo.total.toLocaleString() + ' 道',
        sub: `月均 ${report.photo.avgMonth} 道 · ${monthLabel} ${report.photo.currentMonth} 道`
      },
      {
        icon: '🎧',
        label: '磨耳朵累计',
        value: report.ear.totalMinutes.toLocaleString() + ' 分钟',
        sub: `${report.ear.startDate || '—'}起 · 日均 ${report.ear.avgMinutesPerDay} 分钟`
      }
    ]);

    const dailyList = report.dailyList || [];
    if (dailyList.length > 0) {
      const dailyLabels = getDailyLabels(dailyList);
      const scoreData = dailyList.map(d => d.score || 0);
      const timeData = dailyList.map(d => d.time || 0);

      const scoreChartContainer = document.createElement('div');
      scoreChartContainer.style.marginTop = '20px';
      content.appendChild(scoreChartContainer);

      MD3Chart.barChart(scoreChartContainer, {
        title: `${year}年${month}月每日得分`,
        subtitle: '每日练习得分统计',
        data: dailyLabels.map((label, i) => ({ label, value: scoreData[i] || 0 })),
        labels: dailyLabels,
        height: 260,
        legend: ['得分']
      });

      const timeChartContainer = document.createElement('div');
      timeChartContainer.style.marginTop = '20px';
      content.appendChild(timeChartContainer);

      MD3Chart.lineChart(timeChartContainer, {
        title: `${year}年${month}月每日练习时长`,
        subtitle: '每日练习用时（分钟）',
        datasets: [{ label: '练习时长', data: timeData }],
        labels: dailyLabels,
        height: 240,
        showArea: true
      });
    }

    const summary = document.createElement('div');
    summary.style.marginTop = '20px';
    summary.style.padding = '16px';
    summary.style.background = 'var(--md3-chart-surface-variant, #e7e0ec)';
    summary.style.borderRadius = '12px';
    summary.style.fontSize = '0.875rem';
    summary.style.lineHeight = '1.8';
    summary.innerHTML = `
      <div>共练习 <strong>${report.practice.total.toLocaleString()}</strong> 次，平均 <strong>${report.practice.avgMonth}</strong> 次/月，其中 ${year}年${month}月 练习 <strong>${report.practice.currentMonth}</strong> 次</div>
      <div>共答对 <strong>${report.correct.total.toLocaleString()}</strong> 题，平均 <strong>${report.correct.avgMonth}</strong> 题/月，其中 ${year}年${month}月 答对 <strong>${report.correct.currentMonth}</strong> 题</div>
      <div>共练习 <strong>${report.days.total}</strong> 天，平均每天练习 <strong>${report.days.avgMinutesPerDay}</strong> 分钟，其中 ${year}年${month}月 平均用时 <strong>${report.days.avgMinutesCurrentMonth}</strong> 分钟</div>
      <div>共完成 <strong>${report.photo.total}</strong> 道拍照练习，平均 <strong>${report.photo.avgMonth}</strong> 道/月，其中 ${year}年${month}月 完成 <strong>${report.photo.currentMonth}</strong> 道</div>
      <div>${report.ear.startDate || '—'}起，累计磨耳朵 <strong>${report.ear.totalMinutes}</strong> 分钟，平均每天磨耳朵 <strong>${report.ear.avgMinutesPerDay}</strong> 分钟</div>
    `;
    content.appendChild(summary);
  }

  async function loadStats() {
    const yearInput = document.getElementById('statsYear');
    const monthInput = document.getElementById('statsMonth');
    const loading = document.getElementById('statsLoading');
    const content = document.getElementById('statsContent');

    const year = parseInt(yearInput.value, 10) || new Date().getFullYear();
    const month = parseInt(monthInput.value, 10) || (new Date().getMonth() + 1);

    loading.style.display = 'block';
    content.innerHTML = '';

    try {
      const studentId = await getStudentId();
      if (!studentId) {
        throw new Error('无法获取学生ID，请先登录');
      }

      const rawData = await fetchReport(studentId, year, month);
      if (rawData?.errcode && rawData.errcode !== 0) {
        throw new Error(rawData.errstr || '获取数据失败');
      }

      const report = parseReport(rawData, year, month);
      renderStats(report, year, month);
    } catch (e) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--mdui-color-error, #b3261e);">
          <p>加载统计数据失败了喵</p>
          <p style="font-size: 0.875em; color: var(--mdui-color-on-surface-variant, #49454f);">
            ${e.message || '未知错误'}
          </p>
        </div>
      `;
    } finally {
      loading.style.display = 'none';
    }
  }

  function openStatsDialog() {
    const statsDialog = document.getElementById('statsDialog');
    const yearInput = document.getElementById('statsYear');
    const monthInput = document.getElementById('statsMonth');
    const now = new Date();
    yearInput.value = now.getFullYear();
    monthInput.value = now.getMonth() + 1;
    statsDialog.open = true;
    loadStats();
  }

  function init() {
    const statsBtn = document.getElementById('statsBtn');
    const statsNavBtn = document.getElementById('statsNavBtn');
    const refreshBtn = document.getElementById('statsRefreshBtn');

    if (statsBtn) {
      statsBtn.addEventListener('click', openStatsDialog);
    }

    if (statsNavBtn) {
      statsNavBtn.addEventListener('click', openStatsDialog);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadStats);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { loadStats, init };
})();
