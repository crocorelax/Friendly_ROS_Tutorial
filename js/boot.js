// ══ BOOT SEQUENCE ══

const BOOT_LINES = [
  { t: 0,    txt: '[    0.000] Linux 6.1.0-rpi4 #1 SMP PREEMPT',                 cls: 'dim'  },
  { t: 200,  txt: '[    0.312] systemd[1]: Starting system...',                   cls: 'dim'  },
  { t: 400,  txt: '[    0.891] ROS2 Humble Hawksbill initializing...',            cls: 'info' },
  { t: 700,  txt: '[    1.203] Loading bipboup_bringup package...',               cls: 'info' },
  { t: 900,  txt: '[    1.445] robot_state_publisher: OK',                        cls: 'out'  },
  { t: 1100, txt: '[    1.782] lidar_driver (RPLIDAR A2): OK — 10Hz',             cls: 'out'  },
  { t: 1300, txt: '[    2.100] WARNING: nav2 not running — launch required',      cls: 'warn' },
  { t: 1500, txt: '[    2.341] WARNING: bipboup_strategy not running',            cls: 'warn' },
  { t: 1700, txt: '[    2.600] ESTOP active — publish /estop false to release',   cls: 'err'  },
  { t: 2000, txt: '[    3.000] BipBoup Robot ready. Awaiting commands.',          cls: 'green'},
  { t: 2300, txt: '',                                                              cls: ''     },
  { t: 2400, txt: 'Type "help" for available commands.',                           cls: 'info' },
];

const COLOR_MAP = {
  green: 'var(--green)',
  err:   'var(--red)',
  warn:  'var(--yellow)',
  info:  'var(--cyan)',
};

function runBoot() {
  const boot = document.getElementById('boot');

  BOOT_LINES.forEach(({ t, txt, cls }) => {
    if (!txt) return;
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'bline';
      d.style.animationDelay = '0s';
      d.style.color = COLOR_MAP[cls] || 'rgba(100,116,139,.7)';
      d.textContent = txt;
      boot.appendChild(d);
      boot.scrollTop = boot.scrollHeight;
    }, t);
  });

  setTimeout(() => {
    boot.style.transition = 'opacity .5s';
    boot.style.opacity = '0';
    setTimeout(() => {
      boot.style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initApp();
    }, 500);
  }, 3000);
}
