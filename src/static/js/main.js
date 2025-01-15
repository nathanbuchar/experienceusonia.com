function initLazyLoad() {
  lazyload();
}

function initNav() {
  const navDetails = document.querySelector('.nav-module details');
  const navScreen = navDetails.querySelector('.nav-module__screen')

  navDetails.addEventListener('toggle', (evt) => {
    if (navDetails.open) {
      document.body.classList.add('noscroll');

      navScreen.addEventListener('click', function onScreenClick() {
        navDetails.removeAttribute('open');

        document.body.removeEventListener('click', onScreenClick);
      });
    } else {
      document.body.classList.remove('noscroll');
    }
  });
}

initLazyLoad();
initNav();
