const oneSecond = 1000;

class Countdown {
  static instances = new Map();

  constructor(element) {
    this.element = element;
    this.data = this.element.dataset;

    this.countdownInterval();
  }

  countdownInterval() {
    setInterval(() => {
      this.render();
    }, oneSecond);
  }

  render() {
    const countdownParts = [];
    const template = this.data.template;
    const target = this.data.target;

    const now = new Date();
    const targetDate = new Date(target);
    const diff = targetDate - now;

    if (diff < 0) diff = 0;

    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const seconds = totalSeconds % 60;
    const minutes = totalMinutes % 60;
    const hours = totalHours % 24;
    const days = totalDays;

    let countdownStr = '';

    if (days >= 1) {
      countdownStr = `${days} ${days === 1 ? 'day' : 'days'}`;
    } else if (days < 1 && hours >= 1) {
      countdownStr = `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else if (hours < 1 && minutes >= 1) {
      countdownStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    } else if (minutes < 1 && seconds >= 1) {
      countdownStr = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    } else {
      countdownStr = '0 seconds';
    }

    const output = template.replace(/{countdown}/, countdownStr);

    this.element.innerText = output;
  }

  static initializeAll() {
    Array.from(document.querySelectorAll('.countdown')).forEach((element) => {
      const instance = new Countdown(element);

      Countdown.instances.set(element, instance);
    });
  }
}

export default Countdown;
