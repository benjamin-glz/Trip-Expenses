// ── Palette for charts ───────────────────────────────────────────────────
    const ACCENT   = '#6c8eff';
    const ACCENT2  = '#ff7eb3';
    const PIE_COLORS = [
      '#6c8eff','#ff7eb3','#4ade80','#facc15','#fb923c',
      '#a78bfa','#34d399','#f472b6','#60a5fa','#e879f9',
    ];

    const CHART_DEFAULTS = {
      color: '#7a83a6',
      font: { family: 'Inter, sans-serif', size: 11 },
    };

    Chart.defaults.color = CHART_DEFAULTS.color;
    Chart.defaults.font  = CHART_DEFAULTS.font;

    // ── Alpine app ───────────────────────────────────────────────────────────
    function app() {
      return {
        trips: [],
        activeId: null,
        analytics: null,
        compareId: null,
        compareSelectId: '',
        compareAnalytics: null,
        showModal: false,
        uploading: false,
        form: { name: '', daily_budget: '', file: null },
        toast: { visible: false, msg: '', type: 'success' },

        _dailyChart: null,
        _catPerChart: null,
        _catSumChart: null,
        _averageChart: null,
        _percentageChart: null,

        // ── Lifecycle ────────────────────────────────────────────────────────
        async init() {
          await this.loadTrips();
        },

        // ── Helpers ──────────────────────────────────────────────────────────
        fmt(n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }); },

        showToast(msg, type = 'success') {
          this.toast = { visible: true, msg, type };
          setTimeout(() => { this.toast.visible = false; }, 3200);
        },

        // ── API calls ────────────────────────────────────────────────────────
        async loadTrips() {
          const r = await fetch('/api/trips');
          this.trips = await r.json();
        },

        async selectTrip(id) {
          this.activeId = id;
          this.compareId = null;
          this.compareSelectId = '';
          this.compareAnalytics = null;
          const r = await fetch(`/api/trips/${id}/analytics`);
          this.analytics = await r.json();
          await this.$nextTick();
          this.renderCharts();
        },

        async startCompare() {
          if (!this.compareSelectId) return;
          this.compareId = Number(this.compareSelectId);
          const r = await fetch(`/api/trips/${this.compareId}/analytics`);
          this.compareAnalytics = await r.json();
          await this.$nextTick();
          this.renderCharts();
        },

        clearCompare() {
          this.compareId = null;
          this.compareSelectId = '';
          this.compareAnalytics = null;
          this.$nextTick(() => this.renderCharts());
        },

        async createTrip() {
          if (!this.form.name || !this.form.daily_budget || !this.form.file) return;
          this.uploading = true;
          try {
            const fd = new FormData();
            fd.append('name', this.form.name);
            fd.append('daily_budget', this.form.daily_budget);
            fd.append('file', this.form.file);
            const r = await fetch('/api/trips', { method: 'POST', body: fd });
            if (!r.ok) throw new Error('Erreur lors de l\'import');
            const trip = await r.json();
            this.showModal = false;
            this.form = { name: '', daily_budget: '', file: null };
            await this.loadTrips();
            await this.selectTrip(trip.id);
            this.showToast(`${trip.name} importé — ${trip.expenses_imported} dépenses`, 'success');
          } catch (e) {
            this.showToast(e.message, 'error');
          } finally {
            this.uploading = false;
          }
        },

        async deleteTrip(id) {
          if (!confirm('Supprimer ce voyage et toutes ses dépenses ?')) return;
          await fetch(`/api/trips/${id}`, { method: 'DELETE' });
          if (this.activeId === id) {
            this.activeId = null;
            this.analytics = null;
            this.compareId = null;
            this.compareAnalytics = null;
          }
          await this.loadTrips();
          this.showToast('Voyage supprimé', 'success');
        },

        // ── Chart rendering ──────────────────────────────────────────────────
        destroyCharts() {
          [this._dailyChart, this._catPerChart, this._catSumChart, this._averageChart, this._percentageChart].forEach(c => c && c.destroy());
          this._dailyChart = this._catPerChart = this._catSumChart = this._averageChart = this._percentageChart = null;
        },

        renderCharts() {
          this.destroyCharts();
          if (!this.analytics) return;

          const gridCfg = {
            color: 'rgba(255,255,255,0.05)',
          };

          // ── Daily chart ──────────────────────────────────────────────────
          const dailyCtx = document.getElementById('dailyChart');
          if (dailyCtx) {
            const a = this.analytics.daily_chart;
            const datasets = [
              {
                label: `${this.analytics.trip.name} — Réel`,
                data: a.actual,
                borderColor: ACCENT,
                backgroundColor: 'rgba(108,142,255,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
              },
              {
                label: 'Budget prévu',
                data: a.planned,
                borderColor: ACCENT,
                borderDash: [6, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
              },
            ];

            // Add compare trip if present
            if (this.compareId && this.compareAnalytics) {
              const b = this.compareAnalytics.daily_chart;
              // Map compare data to same relative day index
              const maxLen = Math.max(a.actual.length, b.actual.length);
              datasets.push({
                label: `${this.compareAnalytics.trip.name} — Réel`,
                data: b.actual,
                borderColor: ACCENT2,
                backgroundColor: 'rgba(255,126,179,0.08)',
                fill: false,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
              }, 
              {
                label: 'Budget prévu',
                data: b.planned,
                borderColor: ACCENT2,
                borderDash: [6, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
              });
            }

            this._dailyChart = this.buildDailyLine(dailyCtx, a, datasets, gridCfg)
          }

          // ── Category Percentage pie (trip A) ────────────────────────────────────────
          const catPerCtx = document.getElementById('catPerChart');
          if (catPerCtx) {
            const a = this.analytics.percentage_pie;
            const labels = a.labels;
            const data = {
              labels: labels.map((str, index) => `${str} ${a.amounts[index]}%`),
              datasets: [{
                label: labels,
                data: a.amounts ,
                backgroundColor: PIE_COLORS,
                borderColor: '#1e2333',
                borderWidth: 2,
                hoverOffset: 6,
              }],
            };
            
            this._catPerChart = this.buildPie(catPerCtx, data, "%");
          }

          // ── Category Sum pie (trip A) ────────────────────────────────────────
          const catSumCtx = document.getElementById('catSumChart');
          if (catSumCtx) {

            const a = this.analytics.sum_pie;
            const labels = a.labels;
            const data = {
              labels: labels.map((str, index) => `${str} ${a.amounts[index]}€`),
              datasets: [{
                label: labels,
                data: a.amounts ,
                backgroundColor: PIE_COLORS,
                borderColor: '#1e2333',
                borderWidth: 2,
                hoverOffset: 6,
              }],
            };

            this._catSumChart = this.buildPie(catSumCtx, data, "€");
          }
        
          // ── Average chart ──────────────────────────────────────────────────
          const averageCtx = document.getElementById('averageChart');
          if (averageCtx) {
            const a = this.analytics.average_chart;
            const labels =  this.compareId ? [...new Set([...Object.keys(a.averages), ...Object.keys(this.compareAnalytics.average_chart.averages)])].sort() : a.labels
            const data = {
              labels: labels,
              datasets: [{
                label: labels,
                data: Object.values(a.averages),
                backgroundColor: this.compareId ? ACCENT : PIE_COLORS,
                borderColor: ACCENT,
                borderWidth: 1
              }]
            };

            // Add compare trip if present
            if (this.compareId && this.compareAnalytics) {
              const b = this.compareAnalytics.average_chart;
              
              const allLabels = [...new Set([...Object.keys(a.averages), ...Object.keys(b.averages)])].sort();

              // 2. Align values
              const valuesA = allLabels.map(l => a.averages[l] ?? 0);
              const valuesB = allLabels.map(l => b.averages[l] ?? 0);
              data.datasets[0].data = valuesA;

              data.datasets.push({
                label: labels,
                data: valuesB,
                backgroundColor: ACCENT2,
                borderColor: ACCENT,
                borderWidth: 1
              });
            }

            this._averageChart = this.buildBar(averageCtx, data, "€");
          } 

          // ── Average chart ──────────────────────────────────────────────────
          const percentageCtx = document.getElementById('percentageChart');
          if (percentageCtx) {
            const a = this.analytics.percentage_chart;
            const labels =  this.compareId ? [...new Set([...Object.keys(a.percentages), ...Object.keys(this.compareAnalytics.percentage_chart.percentages)])].sort() : a.labels
            const data = {
              labels: labels,
              datasets: [{
                label: labels,
                data: Object.values(a.percentages),
                backgroundColor: this.compareId ? ACCENT : PIE_COLORS,
                borderColor: ACCENT,
                borderWidth: 1
              }]
            };

            // Add compare trip if present
            if (this.compareId && this.compareAnalytics) {
              const b = this.compareAnalytics.percentage_chart;
              
              const allLabels = [...new Set([...Object.keys(a.percentages), ...Object.keys(b.percentages)])].sort();

              // 2. Align values
              const valuesA = allLabels.map(l => a.percentages[l] ?? 0);
              const valuesB = allLabels.map(l => b.percentages[l] ?? 0);
              data.datasets[0].data = valuesA;

              data.datasets.push({
                label: labels,
                data: valuesB,
                backgroundColor: ACCENT2,
                borderColor: ACCENT,
                borderWidth: 1
              });
            }

            this._averageChart = this.buildBar(percentageCtx, data, "%");
          } 
        
        },

        buildDailyLine(dailyCtx, a, datasets, gridCfg) {
            return new Chart(dailyCtx, {
              type: 'line',
              data: {
                labels: this.compareId
                  ? Array.from({ length: Math.max(a.actual.length, (this.compareAnalytics?.daily_chart.actual.length || 0)) }, (_, i) => `J${i + 1}`)
                  : a.labels,
                datasets,
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { labels: { boxWidth: 10, padding: 16, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: ctx => ` ${ctx.dataset.label}: ${this.fmt(ctx.raw)} €`,
                    },
                  },
                },
                scales: {
                  x: { grid: gridCfg, ticks: { maxTicksLimit: 10, maxRotation: 0 } },
                  y: { grid: gridCfg, ticks: { callback: v => v + ' €' } },
                },
              },
            });
        },

        buildPie(ctx, data, symbol) {
          return new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '62%',
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    boxWidth: 10,
                    padding: 10,
                    font: { size: 11 },
                  },
                },
                tooltip: {
                  callbacks: {
                    label: ctx => ` ${ctx.label}`,
                    title: () => '',
                  },
                },
              },
            },
          });
        },

        buildBar(ctx, data, symbol) {
          return new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { 
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    label: ctx => ` ${ctx.label}: ${this.fmt(ctx.raw)} ${symbol}`,
                    title: () => '',
                  } 
                }
              },
              scales: {
                  y: {
                      beginAtZero: true
                  }
              }
            }
          });
        },
        
      }
    }