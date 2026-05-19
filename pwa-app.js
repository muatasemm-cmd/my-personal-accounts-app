(function () {
    const STORAGE_KEY = "personalaccounts.device.store.v1";
    const INSTALL_DISMISSED_KEY = "personalaccounts.install.dismissed";
    const DEFAULT_STATE = {
        profile: {
            deviceName: "",
            currency: "₪",
            monthlyBudget: 0,
            savingGoal: 0,
            passcode: ""
        },
        incomes: [],
        expenses: [],
        debts: [],
        commitments: []
    };

    const appRoot = document.getElementById("pwaAppShell");
    if (!appRoot) {
        return;
    }

    const refs = {
        installSheet: document.getElementById("installSheet"),
        dismissInstallSheet: document.getElementById("dismissInstallSheet"),
        lockScreen: document.getElementById("lockScreen"),
        deviceApp: document.getElementById("deviceApp"),
        unlockForm: document.getElementById("unlockForm"),
        unlockPasscode: document.getElementById("unlockPasscode"),
        unlockError: document.getElementById("unlockError"),
        resetLockedDeviceButton: document.getElementById("resetLockedDeviceButton"),
        firstRunCard: document.getElementById("firstRunCard"),
        profileForm: document.getElementById("profileForm"),
        settingsForm: document.getElementById("settingsForm"),
        lockDeviceButton: document.getElementById("lockDeviceButton"),
        exportBackupButton: document.getElementById("exportBackupButton"),
        importBackupInput: document.getElementById("importBackupInput"),
        resetDeviceButton: document.getElementById("resetDeviceButton"),
        backupStatus: document.getElementById("backupStatus"),
        toastMessage: document.getElementById("toastMessage"),
        welcomeTitle: document.getElementById("welcomeTitle"),
        welcomeSubtitle: document.getElementById("welcomeSubtitle"),
        standaloneBadge: document.getElementById("standaloneBadge"),
        monthBalanceValue: document.getElementById("monthBalanceValue"),
        todayExpenseValue: document.getElementById("todayExpenseValue"),
        dueCommitmentsValue: document.getElementById("dueCommitmentsValue"),
        monthIncomeValue: document.getElementById("monthIncomeValue"),
        monthIncomeHint: document.getElementById("monthIncomeHint"),
        monthExpenseValue: document.getElementById("monthExpenseValue"),
        monthExpenseHint: document.getElementById("monthExpenseHint"),
        netDebtValue: document.getElementById("netDebtValue"),
        netDebtHint: document.getElementById("netDebtHint"),
        savingProgressValue: document.getElementById("savingProgressValue"),
        savingProgressHint: document.getElementById("savingProgressHint"),
        recentActivityList: document.getElementById("recentActivityList"),
        upcomingCommitmentsList: document.getElementById("upcomingCommitmentsList"),
        moneyEntriesList: document.getElementById("moneyEntriesList"),
        debtsList: document.getElementById("debtsList"),
        commitmentsList: document.getElementById("commitmentsList")
    };

    forceResetFromQueryIfNeeded();

    let state = loadState();
    let toastTimer = null;
    let isUnlocked = !state.profile.passcode;

    bindDates();
    bindTabs();
    bindForms();
    updateInstallHint();
    render();

    function bindDates() {
        const today = formatDateInput(new Date());
        ["incomeDate", "expenseDate", "debtDate", "commitmentDate"].forEach(function (id) {
            const element = document.getElementById(id);
            if (element) {
                element.value = today;
            }
        });
    }

    function bindTabs() {
        document.querySelectorAll("[data-section]").forEach(function (button) {
            button.addEventListener("click", function () {
                const section = button.getAttribute("data-section");
                document.querySelectorAll(".section-tab").forEach(function (tab) {
                    tab.classList.toggle("is-active", tab === button);
                });
                document.querySelectorAll("[data-section-panel]").forEach(function (panel) {
                    panel.classList.toggle("is-active", panel.getAttribute("data-section-panel") === section);
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });
    }

    function bindForms() {
        refs.dismissInstallSheet.addEventListener("click", function () {
            localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
            refs.installSheet.hidden = true;
        });

        refs.unlockForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const value = refs.unlockPasscode.value.trim();
            if (!state.profile.passcode || value === state.profile.passcode) {
                isUnlocked = true;
                refs.unlockPasscode.value = "";
                refs.unlockError.textContent = "";
                render();
                return;
            }

            refs.unlockError.textContent = "رمز المرور غير صحيح.";
        });

        refs.resetLockedDeviceButton.addEventListener("click", function () {
            const confirmed = window.confirm("سيتم حذف كل بيانات هذا الجهاز المحلي نهائيًا. هل تريد المتابعة؟");
            if (!confirmed) {
                return;
            }

            state = structuredClone(DEFAULT_STATE);
            saveState();
            isUnlocked = true;
            refs.unlockPasscode.value = "";
            refs.unlockError.textContent = "";
            showToast("تم تصفير بيانات هذا الجهاز.");
            render();
        });

        refs.profileForm.addEventListener("submit", function (event) {
            event.preventDefault();
            state.profile = {
                deviceName: document.getElementById("profileName").value.trim(),
                currency: sanitizeCurrency(document.getElementById("profileCurrency").value),
                monthlyBudget: parseAmount(document.getElementById("profileBudget").value),
                savingGoal: parseAmount(document.getElementById("profileSavingGoal").value),
                passcode: document.getElementById("profilePasscode").value.trim()
            };
            saveState();
            isUnlocked = !state.profile.passcode || isUnlocked;
            showToast("تم تجهيز هذا الجهاز بنجاح.");
            render();
        });

        refs.settingsForm.addEventListener("submit", function (event) {
            event.preventDefault();
            state.profile.deviceName = document.getElementById("settingsName").value.trim();
            state.profile.currency = sanitizeCurrency(document.getElementById("settingsCurrency").value);
            state.profile.monthlyBudget = parseAmount(document.getElementById("settingsBudget").value);
            state.profile.savingGoal = parseAmount(document.getElementById("settingsSavingGoal").value);
            state.profile.passcode = document.getElementById("settingsPasscode").value.trim();
            saveState();
            if (!state.profile.passcode) {
                isUnlocked = true;
            }
            showToast("تم تحديث إعدادات هذا الجهاز.");
            render();
        });

        document.getElementById("incomeForm").addEventListener("submit", function (event) {
            event.preventDefault();
            state.incomes.unshift({
                id: crypto.randomUUID(),
                title: document.getElementById("incomeTitle").value.trim(),
                amount: parseAmount(document.getElementById("incomeAmount").value),
                date: document.getElementById("incomeDate").value,
                category: document.getElementById("incomeCategory").value.trim(),
                createdAt: new Date().toISOString()
            });
            saveState();
            event.target.reset();
            document.getElementById("incomeDate").value = formatDateInput(new Date());
            showToast("تم حفظ الدخل.");
            render();
        });

        document.getElementById("expenseForm").addEventListener("submit", function (event) {
            event.preventDefault();
            state.expenses.unshift({
                id: crypto.randomUUID(),
                title: document.getElementById("expenseTitle").value.trim(),
                amount: parseAmount(document.getElementById("expenseAmount").value),
                date: document.getElementById("expenseDate").value,
                category: document.getElementById("expenseCategory").value.trim(),
                note: document.getElementById("expenseNote").value.trim(),
                createdAt: new Date().toISOString()
            });
            saveState();
            event.target.reset();
            document.getElementById("expenseDate").value = formatDateInput(new Date());
            showToast("تم حفظ المصروف.");
            render();
        });

        document.getElementById("debtForm").addEventListener("submit", function (event) {
            event.preventDefault();
            state.debts.unshift({
                id: crypto.randomUUID(),
                person: document.getElementById("debtPerson").value.trim(),
                amount: parseAmount(document.getElementById("debtAmount").value),
                type: document.getElementById("debtType").value,
                date: document.getElementById("debtDate").value,
                note: document.getElementById("debtNote").value.trim(),
                createdAt: new Date().toISOString()
            });
            saveState();
            event.target.reset();
            document.getElementById("debtDate").value = formatDateInput(new Date());
            showToast("تم حفظ الدين.");
            render();
        });

        document.getElementById("commitmentForm").addEventListener("submit", function (event) {
            event.preventDefault();
            state.commitments.unshift({
                id: crypto.randomUUID(),
                name: document.getElementById("commitmentName").value.trim(),
                amount: parseAmount(document.getElementById("commitmentAmount").value),
                dueDate: document.getElementById("commitmentDate").value,
                isPaid: false,
                createdAt: new Date().toISOString()
            });
            saveState();
            event.target.reset();
            document.getElementById("commitmentDate").value = formatDateInput(new Date());
            showToast("تم حفظ الالتزام.");
            render();
        });

        refs.lockDeviceButton.addEventListener("click", function () {
            if (!state.profile.passcode) {
                showToast("أضف رمز قفل أولًا من الإعدادات.");
                return;
            }
            isUnlocked = false;
            render();
        });

        refs.exportBackupButton.addEventListener("click", function () {
            const payload = JSON.stringify(state, null, 2);
            const blob = new Blob([payload], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "personalaccounts-device-backup.json";
            link.click();
            URL.revokeObjectURL(url);
            refs.backupStatus.textContent = "تم إنشاء نسخة JSON لهذا الجهاز.";
            showToast("تم تصدير النسخة.");
        });

        refs.importBackupInput.addEventListener("change", function (event) {
            const file = event.target.files && event.target.files[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    const parsed = JSON.parse(String(reader.result || "{}"));
                    state = normalizeState(parsed);
                    saveState();
                    isUnlocked = !state.profile.passcode;
                    refs.backupStatus.textContent = "تم استيراد النسخة بنجاح.";
                    showToast("تم استيراد النسخة.");
                    render();
                } catch (error) {
                    refs.backupStatus.textContent = "الملف غير صالح.";
                    showToast("تعذر قراءة ملف النسخة.");
                }
                refs.importBackupInput.value = "";
            };
            reader.readAsText(file);
        });

        refs.resetDeviceButton.addEventListener("click", function () {
            const confirmed = window.confirm("سيتم حذف كل بيانات هذا الجهاز فقط. هل أنت متأكد؟");
            if (!confirmed) {
                return;
            }
            state = structuredClone(DEFAULT_STATE);
            saveState();
            isUnlocked = true;
            refs.backupStatus.textContent = "تم تصفير بيانات هذا الجهاز.";
            showToast("تم حذف البيانات المحلية من هذا الجهاز.");
            render();
        });
    }

    function render() {
        setElementVisible(refs.lockScreen, !isUnlocked);
        setElementVisible(refs.deviceApp, isUnlocked);
        setElementVisible(refs.firstRunCard, isUnlocked && !state.profile.deviceName);

        if (!isUnlocked) {
            refs.unlockPasscode.focus();
            return;
        }

        hydrateProfileForms();
        renderOverview();
        renderMoneyEntries();
        renderDebts();
        renderCommitments();
        refs.welcomeTitle.textContent = state.profile.deviceName ? "حساباتي - " + state.profile.deviceName : "حساباتي على هذا الجهاز";
        refs.welcomeSubtitle.textContent = state.profile.deviceName
            ? "كل بيانات " + state.profile.deviceName + " محفوظة داخل هذا الجهاز فقط."
            : "كل شيء محفوظ محليًا داخل هذا الجهاز. لا يوجد مزامنة ولا يحتاج إنترنت.";
        refs.standaloneBadge.textContent = isStandalone() ? "مثبّت على الشاشة" : "يفضل التثبيت من Safari";
    }

    function hydrateProfileForms() {
        setValue("profileName", state.profile.deviceName);
        setValue("profileCurrency", state.profile.currency || "₪");
        setValue("profileBudget", state.profile.monthlyBudget || "");
        setValue("profileSavingGoal", state.profile.savingGoal || "");
        setValue("profilePasscode", state.profile.passcode || "");
        setValue("settingsName", state.profile.deviceName);
        setValue("settingsCurrency", state.profile.currency || "₪");
        setValue("settingsBudget", state.profile.monthlyBudget || "");
        setValue("settingsSavingGoal", state.profile.savingGoal || "");
        setValue("settingsPasscode", state.profile.passcode || "");
    }

    function renderOverview() {
        const today = formatDateInput(new Date());
        const monthKey = today.slice(0, 7);
        const currency = state.profile.currency || "₪";

        const monthIncomes = state.incomes.filter(function (item) { return item.date && item.date.startsWith(monthKey); });
        const monthExpenses = state.expenses.filter(function (item) { return item.date && item.date.startsWith(monthKey); });
        const monthIncomeTotal = sum(monthIncomes, "amount");
        const monthExpenseTotal = sum(monthExpenses, "amount");
        const monthBalance = monthIncomeTotal - monthExpenseTotal;
        const todayExpense = sum(state.expenses.filter(function (item) { return item.date === today; }), "amount");
        const dueCommitments = state.commitments.filter(function (item) { return !item.isPaid; });
        const debtNet = calculateNetDebt();
        const savingGoal = Number(state.profile.savingGoal || 0);
        const actualSaving = monthIncomeTotal - monthExpenseTotal;
        const savingPercent = savingGoal > 0 ? Math.max(0, Math.min(100, Math.round((actualSaving / savingGoal) * 100))) : 0;

        refs.monthBalanceValue.textContent = formatMoney(monthBalance, currency);
        refs.todayExpenseValue.textContent = formatMoney(todayExpense, currency);
        refs.dueCommitmentsValue.textContent = String(dueCommitments.length);
        refs.monthIncomeValue.textContent = formatMoney(monthIncomeTotal, currency);
        refs.monthIncomeHint.textContent = monthIncomes.length + " عملية";
        refs.monthExpenseValue.textContent = formatMoney(monthExpenseTotal, currency);
        refs.monthExpenseHint.textContent = monthExpenses.length + " عملية";
        refs.netDebtValue.textContent = formatMoney(debtNet, currency);
        refs.netDebtHint.textContent = debtNet >= 0 ? "إلك أكثر مما عليك" : "عليك أكثر مما إلك";
        refs.savingProgressValue.textContent = savingGoal > 0 ? savingPercent + "%" : formatMoney(actualSaving, currency);
        refs.savingProgressHint.textContent = savingGoal > 0 ? "تقدم هدف التوفير" : "صافي هذا الشهر";

        renderRecentActivity(currency);
        renderUpcomingCommitments(currency);
    }

    function renderRecentActivity(currency) {
        const activity = state.incomes.map(function (item) {
            return { kind: "income", id: item.id, title: item.title, subtitle: item.category || "دخل", date: item.date, amount: item.amount };
        }).concat(state.expenses.map(function (item) {
            return { kind: "expense", id: item.id, title: item.title, subtitle: item.category || item.note || "مصروف", date: item.date, amount: item.amount };
        }))
        .sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime(); })
        .slice(0, 6);

        refs.recentActivityList.innerHTML = activity.length
            ? activity.map(function (item) { return listItemMarkup(item.title, item.subtitle + " - " + formatDisplayDate(item.date), formatMoney(item.amount, currency), item.kind === "income" ? "income" : "expense"); }).join("")
            : emptyMarkup("لا توجد حركات بعد. ابدأ بإضافة أول دخل أو مصروف.");
    }

    function renderUpcomingCommitments(currency) {
        const today = new Date();
        const items = state.commitments
            .filter(function (item) { return !item.isPaid; })
            .sort(function (a, b) { return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); })
            .slice(0, 6);

        refs.upcomingCommitmentsList.innerHTML = items.length
            ? items.map(function (item) {
                const overdue = new Date(item.dueDate) < new Date(today.toDateString());
                return listItemMarkup(item.name, formatDisplayDate(item.dueDate), formatMoney(item.amount, currency), overdue ? "overdue" : "expense");
            }).join("")
            : emptyMarkup("لا توجد التزامات غير مدفوعة.");
    }

    function renderMoneyEntries() {
        const currency = state.profile.currency || "₪";
        const entries = state.incomes.map(function (item) {
            return { id: item.id, kind: "income", title: item.title, meta: (item.category || "دخل") + " - " + formatDisplayDate(item.date), amount: item.amount };
        }).concat(state.expenses.map(function (item) {
            const subtitle = [item.category || "مصروف", item.note].filter(Boolean).join(" - ");
            return { id: item.id, kind: "expense", title: item.title, meta: subtitle + " - " + formatDisplayDate(item.date), amount: item.amount };
        }))
        .sort(function (a, b) { return b.id.localeCompare(a.id); });

        refs.moneyEntriesList.innerHTML = entries.length
            ? entries.map(function (item) {
                return deletableListItemMarkup(item.title, item.meta, formatMoney(item.amount, currency), item.kind, item.kind + ":" + item.id, false);
            }).join("")
            : emptyMarkup("لا توجد عمليات بعد.");

        bindDeleteActions(refs.moneyEntriesList, function (token) {
            const parts = token.split(":");
            const kind = parts[0];
            const id = parts[1];
            if (kind === "income") {
                state.incomes = state.incomes.filter(function (item) { return item.id !== id; });
            } else {
                state.expenses = state.expenses.filter(function (item) { return item.id !== id; });
            }
            saveState();
            render();
            showToast("تم حذف الحركة.");
        });
    }

    function renderDebts() {
        const currency = state.profile.currency || "₪";
        const grouped = {};
        state.debts.forEach(function (item) {
            if (!grouped[item.person]) {
                grouped[item.person] = 0;
            }
            grouped[item.person] += item.type === "for-me" ? item.amount : -item.amount;
        });

        const rows = Object.keys(grouped).sort().map(function (person) {
            const amount = grouped[person];
            return listItemMarkup(person, amount >= 0 ? "إلك على الشخص" : "عليك للشخص", formatMoney(amount, currency), amount >= 0 ? "for-me" : "on-me");
        });

        refs.debtsList.innerHTML = rows.length ? rows.join("") : emptyMarkup("لا توجد ديون محفوظة على هذا الجهاز.");
    }

    function renderCommitments() {
        const currency = state.profile.currency || "₪";
        const rows = state.commitments
            .slice()
            .sort(function (a, b) { return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); })
            .map(function (item) {
                const statusText = item.isPaid ? "مدفوع" : formatDisplayDate(item.dueDate);
                return actionableListItemMarkup(
                    item.name,
                    statusText,
                    formatMoney(item.amount, currency),
                    item.isPaid ? "paid" : "expense",
                    item.id,
                    !item.isPaid
                );
            });

        refs.commitmentsList.innerHTML = rows.length ? rows.join("") : emptyMarkup("لا توجد التزامات حتى الآن.");
        bindCommitmentActions();
    }

    function bindCommitmentActions() {
        refs.commitmentsList.querySelectorAll("[data-mark-paid]").forEach(function (button) {
            button.addEventListener("click", function () {
                const id = button.getAttribute("data-mark-paid");
                state.commitments = state.commitments.map(function (item) {
                    if (item.id === id) {
                        item.isPaid = true;
                    }
                    return item;
                });
                saveState();
                render();
                showToast("تم تعليم الالتزام كمدفوع.");
            });
        });

        bindDeleteActions(refs.commitmentsList, function (id) {
            state.commitments = state.commitments.filter(function (item) { return item.id !== id; });
            saveState();
            render();
            showToast("تم حذف الالتزام.");
        });
    }

    function bindDeleteActions(container, callback) {
        container.querySelectorAll("[data-delete-id]").forEach(function (button) {
            button.addEventListener("click", function () {
                callback(button.getAttribute("data-delete-id"));
            });
        });
    }

    function calculateNetDebt() {
        return state.debts.reduce(function (sumValue, item) {
            return sumValue + (item.type === "for-me" ? item.amount : -item.amount);
        }, 0);
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return structuredClone(DEFAULT_STATE);
            }
            return normalizeState(JSON.parse(raw));
        } catch (error) {
            return structuredClone(DEFAULT_STATE);
        }
    }

    function forceResetFromQueryIfNeeded() {
        const params = new URLSearchParams(window.location.search);
        const wantsReset =
            params.get("reset") === "1" ||
            params.get("clear") === "1" ||
            params.get("fresh") === "1";

        if (!wantsReset) {
            return;
        }

        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
    }

    function normalizeState(raw) {
        const data = raw || {};
        return {
            profile: {
                deviceName: String(data.profile && data.profile.deviceName || ""),
                currency: sanitizeCurrency(data.profile && data.profile.currency),
                monthlyBudget: Number(data.profile && data.profile.monthlyBudget || 0),
                savingGoal: Number(data.profile && data.profile.savingGoal || 0),
                passcode: String(data.profile && data.profile.passcode || "")
            },
            incomes: Array.isArray(data.incomes) ? data.incomes : [],
            expenses: Array.isArray(data.expenses) ? data.expenses : [],
            debts: Array.isArray(data.debts) ? data.debts : [],
            commitments: Array.isArray(data.commitments) ? data.commitments : []
        };
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function showToast(message) {
        refs.toastMessage.hidden = false;
        refs.toastMessage.textContent = message;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            refs.toastMessage.hidden = true;
        }, 2200);
    }

    function updateInstallHint() {
        const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
        const show = isIos() && !isStandalone() && !dismissed;
        refs.installSheet.hidden = !show;
    }

    function isIos() {
        const ua = window.navigator.userAgent || "";
        return /iphone|ipad|ipod/i.test(ua);
    }

    function isStandalone() {
        return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function listItemMarkup(title, meta, value, tone) {
        return "<div class=\"list-item\">" +
            "<div class=\"list-item-main\"><div class=\"list-item-title\">" + escapeHtml(title) + "</div><div class=\"list-item-meta\">" + escapeHtml(meta) + "</div></div>" +
            "<div class=\"list-item-value " + tone + "\">" + escapeHtml(value) + "</div>" +
            "</div>";
    }

    function deletableListItemMarkup(title, meta, value, tone, token) {
        return "<div class=\"list-item\">" +
            "<div class=\"list-item-main\"><div class=\"list-item-title\">" + escapeHtml(title) + "</div><div class=\"list-item-meta\">" + escapeHtml(meta) + "</div></div>" +
            "<div class=\"list-item-actions\"><div class=\"list-item-value " + tone + "\">" + escapeHtml(value) + "</div><button class=\"inline-action danger\" type=\"button\" data-delete-id=\"" + escapeAttribute(token) + "\">حذف</button></div>" +
            "</div>";
    }

    function actionableListItemMarkup(title, meta, value, tone, id, canMarkPaid) {
        return "<div class=\"list-item\">" +
            "<div class=\"list-item-main\"><div class=\"list-item-title\">" + escapeHtml(title) + "</div><div class=\"list-item-meta\">" + escapeHtml(meta) + "</div></div>" +
            "<div class=\"list-item-actions\"><div class=\"list-item-value " + tone + "\">" + escapeHtml(value) + "</div>" +
            (canMarkPaid ? "<button class=\"inline-action success\" type=\"button\" data-mark-paid=\"" + escapeAttribute(id) + "\">تم الدفع</button>" : "") +
            "<button class=\"inline-action danger\" type=\"button\" data-delete-id=\"" + escapeAttribute(id) + "\">حذف</button></div>" +
            "</div>";
    }

    function emptyMarkup(message) {
        return "<div class=\"list-empty\">" + escapeHtml(message) + "</div>";
    }

    function sum(items, key) {
        return items.reduce(function (result, item) {
            return result + Number(item[key] || 0);
        }, 0);
    }

    function parseAmount(value) {
        const parsed = Number(value || 0);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function sanitizeCurrency(value) {
        return String(value || "₪").trim() || "₪";
    }

    function formatMoney(value, currency) {
        const amount = Number(value || 0);
        const sign = amount > 0 ? "" : "";
        return sign + amount.toFixed(2) + " " + currency;
    }

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function formatDisplayDate(value) {
        if (!value) {
            return "بدون تاريخ";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return new Intl.DateTimeFormat("ar", { year: "numeric", month: "short", day: "numeric" }).format(date);
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    function setElementVisible(element, visible) {
        if (!element) {
            return;
        }

        element.hidden = !visible;
        element.style.display = visible ? "" : "none";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
    }
})();
