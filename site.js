// Register the service worker for the installable iPhone-friendly app shell.
(function () {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", function () {
        var serviceWorkerUrl = new URL("service-worker.js", window.location.href).toString();
        navigator.serviceWorker.register(serviceWorkerUrl).catch(function () {
            // Ignore registration failures silently so the app still works as a normal web page.
        });
    });
})();
