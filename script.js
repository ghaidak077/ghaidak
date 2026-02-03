document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const root = document.documentElement;
    const navEl = document.querySelector('.hud-nav');

    const setNavVars = () => {
        if (!navEl) return;
        const rect = navEl.getBoundingClientRect();
        // Only update these on initial load/resize to avoid layout trashing
        root.style.setProperty('--nav-h', `${Math.round(rect.height)}px`);
        if(!navEl.classList.contains('scrolled')) {
             root.style.setProperty('--nav-offset', `${Math.max(0, Math.round(rect.top))}px`);
        }
    };

    setNavVars();
    window.addEventListener('resize', setNavVars, { passive: true });
    window.addEventListener('load', setNavVars);

    const loader = document.getElementById('loader');
    if (loader) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const hideLoader = () => {
            if (reduceMotion || !window.gsap) {
                loader.style.display = 'none';
                return;
            }
            gsap.to(loader, { y: "-100%", duration: 0.7, ease: "power4.inOut" });
            gsap.from(".reveal-text", { y: 60, opacity: 0, duration: 1.0, stagger: 0.08, ease: "power3.out", delay: 0.1 });
        };

        // PERFORMANCE FIX: Instant load for mobile (LCP < 2.5s), smooth for desktop
        if (isMobile) {
            hideLoader();
        } else {
            setTimeout(hideLoader, 300);
        }
        
        // Failsafe cleanup
        setTimeout(() => { loader.style.display = 'none'; }, 2500);
    }

    if (typeof Lenis !== 'undefined' && !isMobile) {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothTouch: false
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        const scrollTopBtn = document.getElementById('scrollTop');
        if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => lenis.scrollTo(0));
    } else {
        const scrollTopBtn = document.getElementById('scrollTop');
        if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    const cursorDot = document.querySelector('[data-cursor-dot]');
    const cursorOutline = document.querySelector('[data-cursor-outline]');

    if (!isMobile && cursorDot) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 500, fill: "forwards" });
        });

        const interactives = document.querySelectorAll('a, button, .project-item, .hover-trigger');
        interactives.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
        });
    }

    const nav = document.querySelector('.hud-nav');
    const scrollTopBtn = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;

        // Apply scroll effect only on desktop (mobile is always fixed via CSS)
        if (!isMobile && nav) {
            if (scrolled > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }

        if (scrollTopBtn) {
            if (scrolled > 500) scrollTopBtn.classList.add('visible');
            else scrollTopBtn.classList.remove('visible');
        }
    }, { passive: true });

    if ('IntersectionObserver' in window) {
        const allBgs = document.querySelectorAll('.curtain-img');
        const defaultBg = document.querySelector('#bg-default');
        const projectItems = document.querySelectorAll('.project-item');
        const heroSection = document.querySelector('.hero-section');

        const activateProjectBg = (targetId) => {
            const targetBg = document.getElementById(targetId);
            if (targetBg) {
                requestAnimationFrame(() => {
                    allBgs.forEach(bg => {
                        bg.classList.remove('active-project');
                        bg.classList.remove('default-visible');
                    });
                    targetBg.classList.add('active-project');
                });
            }
        };

        const activateDefaultBg = () => {
            requestAnimationFrame(() => {
                allBgs.forEach(bg => {
                    bg.classList.remove('active-project');
                    bg.classList.remove('default-visible');
                });
                if (defaultBg) defaultBg.classList.add('default-visible');
            });
        };

        const observerMargin = isMobile ? "-20% 0px -20% 0px" : "-45% 0px -45% 0px";

        const projectObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetId = entry.target.getAttribute('data-bg');
                    activateProjectBg(targetId);
                }
            });
        }, { rootMargin: observerMargin, threshold: 0 });

        projectItems.forEach(item => projectObserver.observe(item));

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) activateDefaultBg(); });
        }, { threshold: 0.1 });

        if (heroSection) heroObserver.observe(heroSection);
    }
});