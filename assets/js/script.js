// Navbar Scroll Effect
window.addEventListener("scroll", function () {
  const nav = document.querySelector("nav");
  if (window.scrollY > 20) {
    nav.classList.add("scroll");
  } else {
    nav.classList.remove("scroll");
  }
});

// Active Nav Link on Scroll
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-links a");
  const sections = document.querySelectorAll("main section[id], footer");

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      root: null,
      rootMargin: `-${Math.round(document.querySelector("nav")?.offsetHeight || 88) + 20}px 0px -50% 0px`,
      threshold: 0,
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));

  // Set initial active on page load
  setActiveLink("home");
});

// Scroll Reveal Animation with Intersection Observer
document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealElements = document.querySelectorAll(".reveal");

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add("active"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      threshold: 0.1,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
});

// --- Unique Micro-Interactions ---
document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Scroll progress bar
  const progressBar = document.querySelector(".scroll-progress");
  if (progressBar) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${percent}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  // Count-up for hero-meta values
  if (!prefersReducedMotion) {
    const metaValues = document.querySelectorAll(".hero-meta .meta-value");
    const countObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          observer.unobserve(el);
          const original = el.textContent.trim();
          const match = original.match(/[\d.]+/);
          if (!match) return;
          const numStr = match[0];
          const target = parseFloat(numStr);
          if (Number.isNaN(target)) return;
          const decimals = numStr.includes(".")
            ? numStr.split(".")[1].length
            : 0;
          const prefix = original.slice(0, match.index);
          const suffix = original.slice(match.index + numStr.length);
          const duration = 1200;
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = (target * eased).toFixed(decimals);
            el.textContent = `${prefix}${current}${suffix}`;
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              el.textContent = original;
            }
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    metaValues.forEach((el) => countObserver.observe(el));
  }

  // Text scramble / decode (terminal style)
  if (!prefersReducedMotion) {
    const scrambleTargets = document.querySelectorAll(
      ".hero .greeting, .section-label"
    );
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_-#%";
    const scramble = (el) => {
      const finalText = el.textContent;
      const length = finalText.length;
      const duration = 700;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const revealCount = Math.floor(progress * length);
        let output = "";
        for (let i = 0; i < length; i++) {
          const ch = finalText[i];
          if (i < revealCount || ch === " ") {
            output += ch;
          } else {
            output += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = output;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = finalText;
        }
      };
      requestAnimationFrame(tick);
    };
    const scrambleObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          scramble(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    scrambleTargets.forEach((el) => scrambleObserver.observe(el));
  }

  // Pointer-based effects: custom cursor, magnetic buttons, hero parallax
  if (canHover && !prefersReducedMotion) {
    const cursor = document.querySelector(".cursor-dot");
    const heroTitle = document.querySelector(".hero h1");
    const magnets = document.querySelectorAll("[data-magnetic]");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let heroX = 0;
    let heroY = 0;
    let targetHeroX = 0;
    let targetHeroY = 0;

    if (cursor) {
      document.body.classList.add("cursor-active");
    }

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (cursor) cursor.classList.add("is-visible");

      // Hero parallax target (subtle shift from screen center)
      if (heroTitle) {
        targetHeroX = (e.clientX / window.innerWidth - 0.5) * 24;
        targetHeroY = (e.clientY / window.innerHeight - 0.5) * 16;
      }
    });

    document.addEventListener("mouseleave", () => {
      if (cursor) cursor.classList.remove("is-visible");
    });

    // Cursor grows over interactive elements
    if (cursor) {
      const hoverTargets = document.querySelectorAll(
        "a, button, [data-magnetic], .portofolio-item"
      );
      hoverTargets.forEach((el) => {
        el.addEventListener("mouseenter", () =>
          cursor.classList.add("is-hover")
        );
        el.addEventListener("mouseleave", () =>
          cursor.classList.remove("is-hover")
        );
      });
    }

    // Magnetic pull toward cursor
    magnets.forEach((el) => {
      const strength = 0.3;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        el.style.translate = `${relX * strength}px ${relY * strength}px`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.translate = "0px 0px";
      });
    });

    // Smooth animation loop for cursor + hero parallax
    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      if (cursor) {
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
      }
      if (heroTitle) {
        heroX += (targetHeroX - heroX) * 0.08;
        heroY += (targetHeroY - heroY) * 0.08;
        heroTitle.style.translate = `${heroX}px ${heroY}px`;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
});