/* =========================================================
   منصة القيصر - JavaScript الرئيسي (النسخة الشاملة)
========================================================= */

// إضافة أيقونة للمتصفح عشان نمنع خطأ 404
document.addEventListener("DOMContentLoaded", function() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = '1.jpeg'; // أو حط مسار اللوجو بتاعك
});


window.addEventListener("supabaseReady", function () {
    initApp();
});

// مسح الحقول عند التحميل لمنع auto-fill
window.addEventListener("load", function () {
    setTimeout(function () {
        const codeInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");

        if (codeInput) codeInput.value = "";
        if (passwordInput) passwordInput.value = "";
    }, 50);
});

function initApp() {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("تعذر تحميل Supabase");
        return;
    }

    const LOGIN_PAGE = "login.html";
    const CHOOSE_PAGE = "choose.html";
    const HIGH_SCHOOL_PAGE = "high-school.html";
    const BACCALAUREATE_PAGE = "baccalaureate.html";
    const REVIEWS_PAGE = "reviews.html";
    const COMPLETE_PROFILE_PAGE = "complete-profile.html";

    /* =========================================================
       0) الكود السحري: جلب الفيديوهات والـ PDF من الداتا بيز
    ========================================================= */
    if (window.supabaseClient) {
        document.addEventListener("DOMContentLoaded", async function () {
            // بنقرأ المتغيرات اللي كل صفحة بتحطها عشان نعرف إحنا فين
            const stage = window.CURRENT_STAGE; 
            const subject = window.CURRENT_SUBJECT;
            
            // لو الصفحة مش محددة (زي صفحة رئيسية)، يبقى مش محتاجة فيديوهات
            if (!stage || !subject) return; 

            // بنجيب الدروس من سوبابيس
            const { data: lessons, error } = await supabase
                .from('lessons_content')
                .select('*')
                .eq('stage', stage)
                .eq('subject', subject);

            if (error || !lessons) return;

            // بندور على الكروت ونطابق الأسماء
            document.querySelectorAll(".lesson-info h3").forEach(titleElement => {
                const lessonName = titleElement.textContent.trim();
                const dbLesson = lessons.find(l => l.lesson_name === lessonName);
                
                if (dbLesson) {
                    const detailsElement = titleElement.closest('.lesson-details');
                    const iframe = detailsElement.querySelector('iframe');
                    const pdfBtn = detailsElement.querySelector('.pdf-button');
                    
                    // 1. الفيديو: بنحط اللينك العادي عشان ميبوظش
                    if (dbLesson.video_url && iframe) {
                        iframe.src = dbLesson.video_url;
                    }

                    // 2. الـ PDF
                    if (pdfBtn) {
                        if (dbLesson.pdf_url) {
                            pdfBtn.href = dbLesson.pdf_url;
                            pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i><span>تحميل ملف الدرس (PDF)</span>';
                            pdfBtn.style.opacity = "1";
                            pdfBtn.style.pointerEvents = "auto";
                        } else {
                            pdfBtn.href = "#";
                            pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i><span>الملف غير متوفر حالياً</span>';
                            pdfBtn.style.opacity = "0.5";
                            pdfBtn.style.pointerEvents = "none";
                        }
                    }
                }
            });
        });
    }

    /* =========================================================
       1) تسجيل الدخول
    ========================================================= */

    function showError(message) {
        const errorBox = document.getElementById("errorBox");
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = "block";
        } else {
            alert(message);
        }
    }

    function hideError() {
        const errorBox = document.getElementById("errorBox");
        if (errorBox) {
            errorBox.textContent = "";
            errorBox.style.display = "none";
        }
    }

    function getStagePage(stage) {
        if (stage === "الثانوية العامة") return HIGH_SCHOOL_PAGE;
        if (stage === "البكالوريا") return BACCALAUREATE_PAGE;
        if (stage === "التقييمات") return REVIEWS_PAGE;
        return null;
    }

    function isEmptyStage(stage) {
        return !stage || String(stage).trim() === "";
    }

    function isValidEgyptianPhone(phone) {
        return /^01[0125]\d{8}$/.test(phone);
    }

    async function getCurrentUser() {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.error("خطأ في التحقق من الطالب:", error.message);
            return null;
        }
        return data.user || null;
    }

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            hideError();

            const codeInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!codeInput || !passwordInput) {
                showError("تعذر العثور على حقول تسجيل الدخول.");
                return;
            }

            const code = codeInput.value.trim().toUpperCase();
            const password = passwordInput.value;

            console.log("LOGIN ATTEMPT:", code, password);

            if (!code || !password) {
                showError("من فضلك أدخل كود الطالب وكلمة المرور.");
                return;
            }

            if (!/^MM-2027-\d{3}$/.test(code)) {
                showError("صيغة كود الطالب غير صحيحة. مثال: MM-2027-001");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "جاري التحقق...";
            }

            try {
                const internalEmail = code.toLowerCase() + "@students.example.com";

                const { data: loginData, error: loginError } =
                    await supabase.auth.signInWithPassword({
                        email: internalEmail,
                        password: password
                    });

                if (!loginError && loginData?.user) {
                    console.log("LOGIN SUCCESS");

                    const user = loginData.user;

                    const { data: profile, error: profileError } = await supabase
                        .from("profiles")
                        .select("education_system")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (profileError) {
                        console.error("خطأ قراءة البروفايل:", profileError);
                        showError("تم تسجيل الدخول، لكن تعذر قراءة بياناتك.");
                        await supabase.auth.signOut();
                        return;
                    }

                    if (!profile) {
                        showError("لا يوجد سجل مرتبط بحسابك.");
                        await supabase.auth.signOut();
                        return;
                    }

                    const visitedKey = "visited_before_" + user.id;
                    const visitedBefore = localStorage.getItem(visitedKey) === "true";
                    if (visitedBefore) {
                        sessionStorage.setItem("welcome_back", "true");
                    } else {
                        localStorage.setItem(visitedKey, "true");
                    }

                    if (isEmptyStage(profile.education_system)) {
                        window.location.replace(CHOOSE_PAGE);
                        return;
                    }

                    const stagePage = getStagePage(profile.education_system);
                    if (stagePage) {
                        window.location.replace(stagePage);
                    } else {
                        showError("المرحلة التعليمية غير معروفة.");
                        await supabase.auth.signOut();
                    }
                    return;
                }

                console.log("LOGIN FAILED → VERIFY NEW CODE");

                const { data: verifyResult, error: verifyError } =
                    await supabase.functions.invoke(
                        "verify-student-code",
                        { body: { code, password } }
                    );

                console.log("VERIFY:", verifyResult);
                console.log("VERIFY ERROR:", verifyError);

                if (verifyError) {
                    console.error("خطأ التحقق:", verifyError);
                    showError("تعذر التحقق من الكود. حاول مرة أخرى.");
                    return;
                }

                if (!verifyResult?.verified) {
                    showError(
                        verifyResult?.error ||
                        "كود الطالب أو كلمة المرور غير صحيحة."
                    );
                    return;
                }

                sessionStorage.setItem("pending_code", code);
                sessionStorage.setItem("pending_password", password);
                window.location.replace(COMPLETE_PROFILE_PAGE);

            } catch (error) {
                console.error("خطأ تسجيل الدخول:", error);
                showError("حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "دخول إلى المنصة";
                }
            }
        });
    }

    /* =========================================================
       2) إكمال البيانات
    ========================================================= */

    const completeProfileForm = document.getElementById("completeProfileForm");

    if (completeProfileForm) {
        const pendingCode = sessionStorage.getItem("pending_code");
        const pendingPassword = sessionStorage.getItem("pending_password");

        if (!pendingCode || !pendingPassword) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        const codeDisplay = document.getElementById("displayCode");
        if (codeDisplay) codeDisplay.textContent = pendingCode;

        completeProfileForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            hideError();

            const nameInput = document.getElementById("fullName");
            const phoneInput = document.getElementById("phone");
            const parentPhoneInput = document.getElementById("parentPhone");
            const submitBtn = completeProfileForm.querySelector('button[type="submit"]');

            if (!nameInput || !phoneInput || !parentPhoneInput) {
                showError("تعذر العثور على الحقول المطلوبة.");
                return;
            }

            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const parentPhone = parentPhoneInput.value.trim();

            if (!name || name.length < 3) {
                showError("من فضلك اكتب اسم الطالب بالكامل.");
                return;
            }

            if (!isValidEgyptianPhone(phone)) {
                showError("رقم الهاتف غير صحيح. مثال: 01012345678");
                return;
            }

            if (!isValidEgyptianPhone(parentPhone)) {
                showError("رقم ولي الأمر غير صحيح.");
                return;
            }

            if (phone === parentPhone) {
                showError("رقم الطالب وولي الأمر لا يمكن أن يكونا متطابقين.");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "جاري إنشاء الحساب...";
            }

            try {
                const { data, error } = await supabase.functions.invoke(
                    "create-student-accounts",
                    {
                        body: {
                            code: pendingCode,
                            password: pendingPassword,
                            name: name,
                            phone: phone,
                            parent_phone: parentPhone
                        }
                    }
                );

                console.log("CREATE:", data);
                console.log("CREATE ERROR:", error);

                if (error) {
                    showError("تعذر إنشاء الحساب. حاول مرة أخرى.");
                    return;
                }

                if (!data?.success) {
                    showError(data?.error || "تعذر إنشاء الحساب.");
                    return;
                }

                sessionStorage.removeItem("pending_code");
                sessionStorage.removeItem("pending_password");
                window.location.replace(CHOOSE_PAGE);

            } catch (error) {
                console.error("خطأ غير متوقع:", error);
                showError("حدث خطأ غير متوقع. حاول مرة أخرى.");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "إنشاء الحساب";
                }
            }
        });
    }

    /* =========================================================
       3) اختيار المرحلة
    ========================================================= */

    async function chooseEducationSystem(stage) {
        const user = await getCurrentUser();
        if (!user) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        const { data: profile, error: readError } = await supabase
            .from("profiles")
            .select("education_system")
            .eq("id", user.id)
            .maybeSingle();

        if (readError || !profile) {
            alert("تعذر قراءة بيانات الطالب.");
            return;
        }

        const existingPage = getStagePage(profile.education_system);
        if (existingPage) {
            window.location.replace(existingPage);
            return;
        }

        const { data: updatedRows, error: updateError } = await supabase
            .from("profiles")
            .update({ education_system: stage })
            .eq("id", user.id)
            .select("education_system");

        if (updateError || !updatedRows || updatedRows.length === 0) {
            alert("لم يتم حفظ المرحلة التعليمية.");
            return;
        }

        const savedStage = updatedRows[0].education_system;
        const destination = getStagePage(savedStage);

        if (!destination) {
            alert("تعذر تحديد الصفحة التعليمية.");
            return;
        }

        window.location.replace(destination);
    }

    const generalSecondaryBtn = document.getElementById("generalSecondary");
    const baccalaureateBtn = document.getElementById("baccalaureate");
    const reviewsBtn = document.getElementById("reviews");

    if (reviewsBtn) {
        reviewsBtn.addEventListener("click", function (e) {
            e.preventDefault();
            chooseEducationSystem("التقييمات"); 
        });
    }

    if (generalSecondaryBtn) {
        generalSecondaryBtn.addEventListener("click", function (e) {
            e.preventDefault();
            chooseEducationSystem("الثانوية العامة");
        });
    }

    if (baccalaureateBtn) {
        baccalaureateBtn.addEventListener("click", function (e) {
            e.preventDefault();
            chooseEducationSystem("البكالوريا");
        });
    }

    /* =========================================================
       4) عرض اسم الطالب
    ========================================================= */

    const homeUsername = document.getElementById("homeUsername");

    if (homeUsername) {
        loadUserProfile();
    }

    async function loadUserProfile() {
        const user = await getCurrentUser();
        if (!user) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("username, education_system")
            .eq("id", user.id)
            .maybeSingle();

        if (error || !data) {
            homeUsername.textContent = "الطالب";
            return;
        }

        homeUsername.textContent = data.username || "الطالب";

        const welcomeText = document.getElementById("welcomeText");
        if (welcomeText) {
            if (sessionStorage.getItem("welcome_back") === "true") {
                welcomeText.textContent = "أهلاً بعودتك يا";
                sessionStorage.removeItem("welcome_back");
            } else {
                welcomeText.textContent = "أهلاً يا";
            }
        }
    }

    /* =========================================================
       5) زر التواصل
    ========================================================= */

    const socialWrapper = document.getElementById("socialWrapper");
    const socialToggle = document.getElementById("socialToggle");

    if (socialWrapper && socialToggle) {
        socialToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            socialWrapper.classList.toggle("open");
        });

        document.addEventListener("click", function (e) {
            if (!socialWrapper.contains(e.target)) {
                socialWrapper.classList.remove("open");
            }
        });

        socialWrapper.querySelectorAll(".social-item").forEach(function (item) {
            item.addEventListener("click", function () {
                socialWrapper.classList.remove("open");
            });
        });
    }

    /* =========================================================
       6) تكبير اللوجو
    ========================================================= */

    const logoCircle = document.getElementById("logoCircle");
    const logoPopup = document.getElementById("logoPopup");
    const closeLogo = document.getElementById("closeLogo");

    if (logoCircle && logoPopup && closeLogo) {
        logoCircle.addEventListener("click", function () {
            logoPopup.classList.add("show");
        });
        closeLogo.addEventListener("click", function () {
            logoPopup.classList.remove("show");
        });
        logoPopup.addEventListener("click", function (e) {
            if (e.target === logoPopup) logoPopup.classList.remove("show");
        });
    }

    /* =========================================================
       7) حماية الصفحات
    ========================================================= */

    protectPages();

    async function protectPages() {
        const currentPage = window.location.pathname.split("/").pop();

        const publicPages = [
            "login.html",
            "complete-profile.html",
            "index.html",
            ""
        ];

        if (publicPages.includes(currentPage)) return;

        const user = await getCurrentUser();
        if (!user) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        const stagePage = getStagePageForCurrentPage(currentPage);
        if (!stagePage) return;

        const { data: profile, error } = await supabase
            .from("profiles")
            .select("education_system")
            .eq("id", user.id)
            .maybeSingle();

        if (error) return;
        if (!profile) {
            window.location.replace(CHOOSE_PAGE);
            return;
        }

        if (isEmptyStage(profile.education_system)) {
            window.location.replace(CHOOSE_PAGE);
            return;
        }

        const savedPage = getStagePage(profile.education_system);
        if (!savedPage) return;

        if (savedPage !== stagePage) {
            window.location.replace(savedPage);
        }
    }

    function getStagePageForCurrentPage(currentPage) {
        if (currentPage === "high-school.html") return HIGH_SCHOOL_PAGE;
        if (currentPage === "baccalaureate.html") return BACCALAUREATE_PAGE;
        if (currentPage === "reviews.html") return REVIEWS_PAGE;
        return null;
    }

    /* =========================================================
       8) تسجيل الخروج
    ========================================================= */

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function () {
            logoutBtn.disabled = true;
            await supabase.auth.signOut();
            sessionStorage.removeItem("welcome_back");
            window.location.replace(LOGIN_PAGE);
        });
    }

    /* =========================================================
       9) زر بدء الرحلة
    ========================================================= */

    const startButton = document.getElementById("startButton");

    if (startButton) {
        startButton.addEventListener("click", function () {
            window.location.href = LOGIN_PAGE;
        });
    }

}


/* =========================================================
   10) زرار الشير في صفحة اختيار النظام
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const chooseSocialWrapper = document.getElementById("chooseSocialWrapper");
    const chooseSocialToggle = document.getElementById("socialToggle");

    if (chooseSocialWrapper && chooseSocialToggle) {
        chooseSocialToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            chooseSocialWrapper.classList.toggle("open");
        });

        document.addEventListener("click", function (e) {
            if (!chooseSocialWrapper.contains(e.target)) {
                chooseSocialWrapper.classList.remove("open");
            }
        });

        chooseSocialWrapper.querySelectorAll(".social-item").forEach(function (item) {
            item.addEventListener("click", function () {
                chooseSocialWrapper.classList.remove("open");
            });
        });
    }

});


/* =========================================================
   11) تسجيل الدروس المشاهدة في localStorage
========================================================= */

function saveWatchedLesson(lessonData) {

    let watched = JSON.parse(localStorage.getItem("watched_lessons") || "[]");

    const exists = watched.find(function (item) {
        return item.title === lessonData.title && item.subject === lessonData.subject;
    });

    if (exists) {
        exists.watched_at = new Date().toISOString();
    } else {
        watched.push({
            title: lessonData.title,
            subject: lessonData.subject,
            url: lessonData.url || "",
            watched_at: new Date().toISOString()
        });
    }

    localStorage.setItem("watched_lessons", JSON.stringify(watched));
}


/* =========================================================
   12) ربط كل درس بالحفظ في localStorage
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const allLessons = document.querySelectorAll(".lesson-details");

    allLessons.forEach(function (lesson) {

        lesson.addEventListener("toggle", function () {

            if (lesson.open) {

                const titleElement = lesson.querySelector(".lesson-info h3");
                const subjectElement = lesson.querySelector(".lesson-info span");

                if (!titleElement) return;

                const title = titleElement.textContent.trim();
                const subject = subjectElement ? subjectElement.textContent.trim() : "";

                saveWatchedLesson({
                    title: title,
                    subject: subject,
                    url: window.location.href
                });
            }
        });
    });
});


/* =========================================================
   13) زرار الرئيسية حسب المرحلة
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {

    const homeNavBtn = document.getElementById("homeNavBtn");
    if (!homeNavBtn) return;

    const supabase = window.supabaseClient;
    if (!supabase) return;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return;

    const { data: profile } = await supabase
        .from("profiles")
        .select("education_system")
        .eq("id", data.user.id)
        .maybeSingle();

    if (!profile) return;

    if (profile.education_system === "البكالوريا") {
        homeNavBtn.href = "baccalaureate.html";
    } else if (profile.education_system === "التقييمات") {
        homeNavBtn.href = "reviews.html"; 
    } else {
        homeNavBtn.href = "high-school.html";
    }

});
