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
      this.document.querySelector("nav").classList.add("bg-nav");
    } else {
      this.document.querySelector("nav").classList.remove("scroll");
      this.document.querySelector("nav").classList.remove("bg-nav");
    }
  },
  false
);
