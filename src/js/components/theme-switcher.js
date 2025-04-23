class ThemeSwitcher {
  constructor(target) {
    this.dropdown = null;
    this.dropdownBtns = null;

    if (typeof target === 'string') {
      this.dropdown = document.querySelector(target);
    }

    if (target instanceof HTMLElement) {
      this.dropdown = target;
    }

    if (!target) {
      throw new Error('No target element found');
    }

    if (this.dropdown) {
      this.dropdownBtns = this.dropdown.querySelectorAll('[data-theme-mode]');
      this.content=this.dropdown.querySelector('.dropdown-content');
    }

    if (this.dropdownBtns && this.dropdownBtns.length) {
      this.updateActiveClass();

      [...this.dropdownBtns].forEach((btn) => {
        btn.addEventListener('click', () => this.toggle(btn));
      });
    }
  }

  toggle(btn) {
    const themeMode = btn.dataset.themeMode;

    if (themeMode === 'light') {
      // Whenever the user explicitly chooses light mode
      localStorage.setItem('theme', 'light');
    }

    if (themeMode === 'dark') {
      // Whenever the user explicitly chooses dark mode
      localStorage.setItem('theme', 'dark');
    }

    if (themeMode === 'system') {
      // Whenever the user explicitly chooses to respect the OS preference
      localStorage.removeItem('theme');
    }

    if (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.updateActiveClass();
    this.content.classList.remove('show');
    if (window.Apex && Apex._chartInstances) {
      Apex._chartInstances.forEach(instance => {
        if (instance && instance.chart) {
          var axisStyle={ 
            fontSize:  '14px',
            fontWeight:'500',
            color:  document.querySelector('.dark') !== null? '#ffffff':"#334155"
          }
          let chart=instance.chart;
          chart.updateOptions({
            xaxis: Array.isArray(chart.w.config.xaxis)
              ? chart.w.config.xaxis.map((x, i) => ({
                  ...x,
                  title: {
                    ...x.title,
                    style: axisStyle
                  }
                }))
              : {
                  ...chart.w.config.xaxis,
                  title: {
                    ...chart.w.config.xaxis.title,
                    style: axisStyle
                  }
                },
          
            yaxis: Array.isArray(chart.w.config.yaxis)
              ? chart.w.config.yaxis.map((y, i) => ({
                  ...y,
                  title: {
                    ...y.title,
                    style: axisStyle
                  }
                }))
              : {
                  ...chart.w.config.yaxis,
                  title: {
                    ...chart.w.config.yaxis.title,
                    style: axisStyle
                  }
                }
          }, false, false, false);
        }
      });
    }
  }

  updateActiveClass() {
    [...this.dropdownBtns].forEach((btn) => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
      }

      if (!localStorage.theme && btn.dataset.themeMode === 'system') {
        btn.classList.add('active');
      }

      if (localStorage.theme === btn.dataset.themeMode) {
        btn.classList.add('active');
      }
    });
  }
}

const themeSwitcher = {
  init() {
    const dropdownThemeSwitcher = document.querySelector('#theme-switcher-dropdown');

    if (dropdownThemeSwitcher) {
      new ThemeSwitcher(dropdownThemeSwitcher);
    }
  },
};

export default themeSwitcher;
