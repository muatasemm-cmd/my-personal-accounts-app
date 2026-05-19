(function () {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", function () {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            registrations.forEach(function (registration) {
                registration.unregister();
            });
        }).catch(function () {
        });

        if (window.location.search.indexOf("reset=1") >= 0) {
            if (window.caches && caches.keys) {
                caches.keys().then(function (keys) {
                    keys.forEach(function (key) {
                        caches.delete(key);
                    });
                }).catch(function () {
                });
            }
        }
    });
})();
