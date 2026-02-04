document.addEventListener('DOMContentLoaded', () => {
    // 1. Cache static queries and elements
    const root = document.documentElement;
    const navEl = document.querySelector('.hud-nav');
    const loader = document.getElementById('loader');
    const scrollTopBtn = document.getElementById('scrollTop');
    const isMobileQuery = window.matchMedia("(max-width: 768px)");
    let isMobile = isMobileQuery.matches;

    // Update isMobile state on change without page reload
    isMobileQuery.addEventListener('change', (e) => { isMobile = e.matches; });

    // 2. Optimized Nav Variables (Fixes Forced Reflow)
    const setNavVars = () => {
        if (!navEl) return;
        
        // READ PHASE: Get dimensions
        const rect = navEl.getBoundingClientRect();
        const height = Math.round(rect.height);
        const top = Math.max(0, Math.round(rect.top));

        // WRITE PHASE: Batch DOM updates in the next frame
        requestAnimationFrame(() => {
            root.style.setProperty('--nav-h', `${height}px`);
            if(!navEl.classList.contains('scrolled')) {
                root.style.setProperty('--nav-offset', `${top}px`);
            }
        });
    };

    // Initial calcs
    setNavVars();
    // Debounced resize listener
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setNavVars, 100);
    }, { passive: true });


    // 3. Loader Logic
    if (loader) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const hideLoader = () => {
            if (reduceMotion || !window.gsap) {
                loader.style.display = 'none';
                return;
            }
            const tl = gsap.timeline({
                onComplete: () => { loader.style.display = 'none'; }
            });
            
            tl.to(loader, { yPercent: -100, duration: 0.7, ease: "power4.inOut" })
              .from(".reveal-text", { 
                  y: 60, 
                  opacity: 0, 
                  duration: 1.0, 
                  stagger: 0.08, 
                  ease: "power3.out" 
              }, "-=0.2");
        };

        // LCP OPTIMIZATION: Instant kill on mobile
        if (isMobile) {
            loader.style.display = 'none';
            // Optional: You could manually reveal the text here if needed, 
            // but relying on CSS defaults is faster for LCP
        } else {
            setTimeout(hideLoader, 300);
        }
        
        // Safety timeout
        setTimeout(() => { if(loader.style.display !== 'none') loader.style.display = 'none'; }, 2500);
    }

    // 4. Scroll Logic (State Caching to reduce DOM hits)
    let hasScrolledClass = false;
    let isScrollBtnVisible = false;

    const onScroll = () => {
        const scrolled = window.scrollY;

        // Nav Logic
        if (!isMobile && navEl) {
            const shouldBeScrolled = scrolled > 50;
            if (shouldBeScrolled !== hasScrolledClass) {
                if (shouldBeScrolled) {
                    navEl.classList.add('scrolled');
                } else {
                    navEl.classList.remove('scrolled');
                }
                hasScrolledClass = shouldBeScrolled;
            }
        }

        // Scroll Top Button Logic
        if (scrollTopBtn) {
            const shouldBtnShow = scrolled > 500;
            if (shouldBtnShow !== isScrollBtnVisible) {
                if (shouldBtnShow) scrollTopBtn.classList.add('visible');
                else scrollTopBtn.classList.remove('visible');
                isScrollBtnVisible = shouldBtnShow;
            }
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });


    // 5. Smooth Scroll (Lenis)
    if (typeof Lenis !== 'undefined' && !isMobile) {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothTouch: false
        });

        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => lenis.scrollTo(0));
    } else {
        if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }


    // 6. Cursor Logic (Hardware Accelerated)
    const cursorDot = document.querySelector('[data-cursor-dot]');
    const cursorOutline = document.querySelector('[data-cursor-outline]');

    if (!isMobile && cursorDot && cursorOutline) {
        // Use transform instead of top/left to avoid layout trashing
        const moveCursor = (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            
            // Direct transform for the dot (instant)
            cursorDot.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
            
            // Animation for the outline
            cursorOutline.animate({
                transform: `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`
            }, { duration: 500, fill: "forwards" });
        };

        window.addEventListener('mousemove', moveCursor, { passive: true });

        const interactives = document.querySelectorAll('a, button, .project-item, .hover-trigger');
        interactives.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
        });
    }

    // 7. Background Curtain Logic (IntersectionObserver)
    if ('IntersectionObserver' in window) {
        const allBgs = document.querySelectorAll('.curtain-img');
        const defaultBg = document.querySelector('#bg-default');
        const projectItems = document.querySelectorAll('.project-item');
        const heroSection = document.querySelector('.hero-section');

        // Helper to batch class removals
        const resetBgs = () => {
             allBgs.forEach(bg => {
                bg.classList.remove('active-project');
                bg.classList.remove('default-visible');
            });
        };

        const activateProjectBg = (targetId) => {
            const targetBg = document.getElementById(targetId);
            if (targetBg) {
                requestAnimationFrame(() => {
                    resetBgs();
                    targetBg.classList.add('active-project');
                });
            }
        };

        const activateDefaultBg = () => {
            requestAnimationFrame(() => {
                resetBgs();
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
