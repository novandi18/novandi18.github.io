window.addEventListener(
  "scroll",
  function () {
    let top = this.scrollY;
    if (top > 20) {
      if (
        this.document.querySelector("nav").classList.contains("scroll") ===
        false
      )
        this.document.querySelector("nav").classList.add("scroll");
    } else {
      this.document.querySelector("nav").classList.remove("scroll");
    }
  },
  false
);
