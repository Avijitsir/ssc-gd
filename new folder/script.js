// আপনার Firebase প্রোজেক্ট কনফিগারেশন (অপরিবর্তিত)
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};

// Firebase ইনিশিয়ালাইজ করুন
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// URL থেকে Quiz ID (অপরিবর্তিত)
const urlParams = new URLSearchParams(window.location.search);
const QUIZ_ID = urlParams.get('quiz');

// --- === নতুন গ্লোবাল ভেরিয়েবল (সেকশন-ভিত্তিক) === ---
let quizData = { sections: [] }; // সম্পূর্ণ কুইজ ডেটা এখানে থাকবে
let allQuestions = []; // সমস্ত সেকশন থেকে প্রশ্নগুলির একটি ফ্ল্যাট অ্যারে
let currentQuestionGlobalIndex = 0; // allQuestions অ্যারের বর্তমান ইনডেক্স
let currentSectionIndex = 0; // বর্তমান সেকশনের ইনডেক্স

let userName = '';
let quizAttemptKey = null;
let quizTitle = "Quiz";
const POSITIVE_MARK = 1.00;
const NEGATIVE_MARK = 0.25;
let quizTimeLimitInMinutes = 30;
let quizTimeRemainingInSeconds;
let quizTimerInterval;

const STATUS = {
    NOT_VISITED: 'not-visited',
    NOT_ANSWERED: 'not-answered',
    ANSWERED: 'answered',
    MARKED: 'marked',
    ANSWERED_MARKED: 'answered-marked'
};

// --- DOM Elements (নতুন সহ) ---
const splashScreen = document.getElementById('splashScreen');
const nameInputScreen = document.getElementById('nameInputScreen');
const userNameInput = document.getElementById('userNameInput');
const proceedToStartScreenButton = document.getElementById('proceedToStartScreenButton');
const nameInputMessage = document.getElementById('nameInputMessage');
const checkScoresButton = document.getElementById('checkScoresButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const totalQuestionsInfo = document.getElementById('totalQuestionsInfo');
const fullMarksInfo = document.getElementById('fullMarksInfo');
const timeLimitInfo = document.getElementById('timeLimitInfo');
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');

const quizTitleHeader = document.getElementById('quizTitleHeader');
const quizTimerText = document.getElementById('quizTimerText');
const positiveMarkDisplay = document.getElementById('positiveMarkDisplay');
const negativeMarkDisplay = document.getElementById('negativeMarkDisplay');
const questionNumberDisplay = document.getElementById('questionNumberDisplay');
const questionTextBox = document.getElementById('questionTextBox');
const optionsContainer = document.getElementById('optionsContainer');

const sectionTabsContainer = document.getElementById('sectionTabsContainer'); // নতুন
const paletteArea = document.getElementById('paletteArea');
const paletteSectionTitle = document.getElementById('paletteSectionTitle'); // নতুন
const questionPalette = document.getElementById('questionPalette');
const paletteUserName = document.getElementById('paletteUserName');
const togglePaletteButton = document.getElementById('togglePaletteButton');
const closePaletteButton = document.getElementById('closePaletteButton');

const prevButton = document.getElementById('prevButton');
const clearButton = document.getElementById('clearButton');
const markReviewButton = document.getElementById('markReviewButton');
const saveNextButton = document.getElementById('saveNextButton');
const finalSubmitButton = document.getElementById('finalSubmitButton');

const submitReviewModal = document.getElementById('submitReviewModal');
const modalGoBackButton = document.getElementById('modalGoBackButton');
const modalFinalSubmitButton = document.getElementById('modalFinalSubmitButton');
const summaryTotal = document.getElementById('summaryTotal');
const summaryAnswered = document.getElementById('summaryAnswered');
const summaryNotAnswered = document.getElementById('summaryNotAnswered');
const summaryMarked = document.getElementById('summaryMarked');

// (রেজাল্ট স্ক্রিনের বাকি Elements...)
const resultSummary = document.getElementById('resultSummary');
const detailedAnswersContainer = document.getElementById('detailedAnswersContainer');
const personalScoresSection = document.getElementById('personalScoresSection');
const rankListElem = document.getElementById('rankList');
const showAllAnswersButton = document.getElementById('showAllAnswersButton');
// ... ইত্যাদি

// --- স্প্ল্যাশ স্ক্রিন লজিক (সেকশন-ভিত্তিক) ---
window.addEventListener('DOMContentLoaded', (event) => {
    if (QUIZ_ID) {
        fetchQuizDataAndShowSplash();
    } else {
        document.body.innerHTML = "<h1>Error: কোনো কুইজ নির্বাচন করা হয়নি। <br> URL-এ ?quiz=QUIZ_ID যোগ করুন।</h1>";
        splashScreen.style.display = 'none';
    }
});

function fetchQuizDataAndShowSplash() {
    database.ref('quizzes/' + QUIZ_ID).once('value', (snapshot) => {
        const data = snapshot.val();
        
        // অ্যাডমিন প্যানেল v1 (প্রশ্ন অ্যারে) এবং v2 (সেকশন অ্যারে) দুটিকেই সমর্থন করবে
        if (data && data.sections) {
            quizData = data; // নতুন সেকশন-ভিত্তিক ডেটা
        } else if (data && data.questions) {
            // যদি পুরনো ফরম্যাটে ডেটা থাকে, সেটিকে একটি সেকশনে মুড়ে দিন
            quizData = {
                title: data.title,
                sections: [
                    { title: "General Quiz", questions: data.questions }
                ]
            };
        } else {
            document.body.innerHTML = `<h1>Error: '${QUIZ_ID}' নামের কোনো কুইজ খুঁজে পাওয়া যায়নি।</h1>`;
            splashScreen.style.display = 'none';
            return;
        }

        // --- নতুন ফ্ল্যাট অ্যারে তৈরি করুন ---
        let globalIndexCounter = 0;
        allQuestions = [];
        quizData.sections.forEach((section, secIndex) => {
            section.questions.forEach((q, qIndex) => {
                allQuestions.push({
                    ...q,
                    status: STATUS.NOT_VISITED,
                    userAnswer: null,
                    globalIndex: globalIndexCounter,
                    sectionIndex: secIndex,
                    questionIndexInSection: qIndex
                });
                globalIndexCounter++;
            });
        });
        // --- ফ্ল্যাট অ্যারে তৈরি শেষ ---
        
        quizTitle = quizData.title || "Quiz";
        quizTimeLimitInMinutes = allQuestions.length * 1; // মোট প্রশ্নের উপর সময়

        document.getElementById('startScreen').querySelector('h1').textContent = quizTitle;
        totalQuestionsInfo.textContent = allQuestions.length;
        fullMarksInfo.textContent = (allQuestions.length * POSITIVE_MARK).toFixed(2);
        timeLimitInfo.textContent = quizTimeLimitInMinutes;

        splashScreen.classList.add('active');
        setTimeout(() => {
            splashScreen.classList.remove('active');
            startScreen.classList.add('active');
        }, 2000);
    }).catch((error) => {
        console.error("Firebase থেকে ডেটা লোড করতে সমস্যা:", error);
        document.body.innerHTML = "<h1>Error: কুইজ লোড করা যায়নি। সার্ভার বা ডাটাবেস চেক করুন।</h1>";
    });
}

// --- Event Listeners ---
proceedToStartScreenButton.addEventListener('click', validateNameAndStartQuiz);
startButton.addEventListener('click', showNameInputScreen);
checkScoresButton.addEventListener('click', validateNameAndShowScores);
prevButton.addEventListener('click', handlePrevQuestion);
clearButton.addEventListener('click', handleClearResponse);
markReviewButton.addEventListener('click', handleMarkReview);
saveNextButton.addEventListener('click', handleSaveNext);
togglePaletteButton.addEventListener('click', () => paletteArea.classList.toggle('active'));
closePaletteButton.addEventListener('click', () => paletteArea.classList.remove('active'));
finalSubmitButton.addEventListener('click', showSubmitReview);
modalGoBackButton.addEventListener('click', () => submitReviewModal.classList.remove('active'));
modalFinalSubmitButton.addEventListener('click', ()Funct);


// --- নাম এবং স্কোর ফাংশন (অপরিবর্তিত) ---
function validateNameAndStartQuiz() { /* ... (অপরিবর্তিত) ... */ }
function validateNameAndShowScores() { /* ... (অপরিবর্তিত) ... */ }
function showNameInputScreen() { /* ... (অপরিবর্তিত) ... */ }

// --- === নতুন কুইজ লজিক (সেকশন-ভিত্তিক) === ---

function startQuiz() {
    nameInputScreen.classList.remove('active');
    quizScreen.classList.add('active');
    quizAttemptKey = database.ref('quizResults/' + QUIZ_ID).push().key;

    quizTitleHeader.textContent = quizTitle;
    paletteUserName.textContent = userName;
    positiveMarkDisplay.textContent = `+${POSITIVE_MARK.toFixed(2)}`;
    negativeMarkDisplay.textContent = `-${NEGATIVE_MARK.toFixed(2)}`;

    renderSectionTabs(); // নতুন: সেকশন ট্যাব তৈরি করুন
    switchSection(0); // নতুন: প্রথম সেকশন অ্যাক্টিভ করুন
    loadQuestion(0); // প্রথম প্রশ্ন লোড করুন (গ্লোবাল ইনডেক্স 0)
    startQuizTimer();
}

// --- নতুন সেকশন ফাংশন ---
function renderSectionTabs() {
    sectionTabsContainer.innerHTML = '';
    quizData.sections.forEach((section, index) => {
        const tab = document.createElement('button');
        tab.classList.add('tab-btn');
        tab.textContent = section.title;
        tab.dataset.sectionIndex = index;
        
        if (index === currentSectionIndex) {
            tab.classList.add('active');
        }

        tab.addEventListener('click', () => {
            switchSection(index);
            // সেকশনের প্রথম প্রশ্নটি লোড করুন
            const firstQuestionOfSection = allQuestions.find(q => q.sectionIndex === index);
            if (firstQuestionOfSection) {
                loadQuestion(firstQuestionOfSection.globalIndex);
            }
        });
        sectionTabsContainer.appendChild(tab);
    });
}

function switchSection(sectionIndex) {
    currentSectionIndex = sectionIndex;
    
    // ট্যাব হাইলাইট আপডেট করুন
    document.querySelectorAll('.tab-btn').forEach((tab, index) => {
        tab.classList.toggle('active', index === sectionIndex);
    });

    // প্যালেট আপডেট করুন শুধু এই সেকশনের প্রশ্ন দেখানোর জন্য
    renderQuestionPalette();
}

// --- কুইজ টাইমার (অপরিবর্তিত) ---
function startQuizTimer() { /* ... (অপরিবর্তিত) ... */ }

// --- প্রশ্ন প্যালেট (আপডেটেড) ---
function renderQuestionPalette() {
    questionPalette.innerHTML = '';
    
    const sectionTitle = quizData.sections[currentSectionIndex].title;
    paletteSectionTitle.textContent = sectionTitle; // প্যালেটের টাইটেল আপডেট

    // শুধু বর্তমান সেকশনের প্রশ্নগুলি ফিল্টার করুন
    const sectionQuestions = allQuestions.filter(q => q.sectionIndex === currentSectionIndex);

    sectionQuestions.forEach((q) => {
        const button = document.createElement('button');
        button.classList.add('palette-button');
        button.textContent = q.questionIndexInSection + 1; // সেকশন-ভিত্তিক নম্বর (1, 2, 3...)
        button.dataset.globalIndex = q.globalIndex; // গ্লোবাল ইনডেক্স সেভ রাখুন
        button.classList.add(q.status);

        if (q.globalIndex === currentQuestionGlobalIndex) {
            button.classList.add('current');
        }

        button.addEventListener('click', () => {
            loadQuestion(q.globalIndex); // গ্লোবাল ইনডেক্স দিয়ে প্রশ্ন লোড করুন
            paletteArea.classList.remove('active');
        });
        questionPalette.appendChild(button);
    });
}

function updatePalette() {
    // শুধু বর্তমান সেকশনের প্যালেট বাটনগুলি আপডেট করুন
    const buttons = questionPalette.querySelectorAll('.palette-button');
    buttons.forEach(button => {
        const globalIndex = parseInt(button.dataset.globalIndex);
        const q = allQuestions[globalIndex];
        
        button.className = 'palette-button'; // ক্লাস রিসেট
        button.classList.add(q.status);
        if (q.globalIndex === currentQuestionGlobalIndex) {
            button.classList.add('current');
        }
    });
}

// --- প্রশ্ন লোড (আপডেটেড) ---
function loadQuestion(globalIndex) {
    if (globalIndex < 0 || globalIndex >= allQuestions.length) return;

    currentQuestionGlobalIndex = globalIndex;
    const q = allQuestions[globalIndex];

    // যদি প্রশ্নটি অন্য সেকশনের হয়, তবে সেকশন সুইচ করুন
    if (q.sectionIndex !== currentSectionIndex) {
        switchSection(q.sectionIndex);
    }

    if (q.status === STATUS.NOT_VISITED) {
        q.status = STATUS.NOT_ANSWERED;
    }

    questionNumberDisplay.textContent = q.globalIndex + 1; // গ্লোবাল প্রশ্ন নম্বর
    questionTextBox.innerHTML = q.question;
    optionsContainer.innerHTML = '';

    q.options.forEach(option => {
        const button = document.createElement('button');
        button.classList.add('option');
        button.innerHTML = option;
        
        if (q.userAnswer === option) {
            button.classList.add('selected');
        }
        button.addEventListener('click', () => selectOption(button, option));
        optionsContainer.appendChild(button);
    });

    prevButton.disabled = (globalIndex === 0);
    saveNextButton.textContent = (globalIndex === allQuestions.length - 1) ? "Save" : "Save & Next";
    markReviewButton.textContent = (globalIndex === allQuestions.length - 1) ? "Mark for Review" : "Mark & Next";

    updatePalette(); // প্যালেট আপডেট
    renderMath();
}

function selectOption(selectedButton, selectedAnswer) {
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    selectedButton.classList.add('selected');
    const q = allQuestions[currentQuestionGlobalIndex];
    q.userAnswer = selectedAnswer;
    
    if (q.status === STATUS.NOT_ANSWERED || q.status === STATUS.ANSWERED) {
        q.status = STATUS.ANSWERED;
    } else if (q.status === STATUS.MARKED) {
        q.status = STATUS.ANSWERED_MARKED;
    }
}

function renderMath() { /* ... (অপরিবর্তিত) ... */ }

// --- নেভিগেশন বাটন (আপডেটেড) ---
function handlePrevQuestion() {
    if (currentQuestionGlobalIndex > 0) {
        loadQuestion(currentQuestionGlobalIndex - 1);
    }
}

function handleSaveNext() {
    const q = allQuestions[currentQuestionGlobalIndex];
    if (q.userAnswer) {
        q.status = STATUS.ANSWERED;
    } else {
        q.status = STATUS.NOT_ANSWERED;
    }
    updatePalette();
    
    if (currentQuestionGlobalIndex < allQuestions.length - 1) {
        loadQuestion(currentQuestionGlobalIndex + 1);
    } else {
        alert("এটি শেষ প্রশ্ন। কুইজ জমা দিন।");
    }
}

function handleMarkReview() {
    const q = allQuestions[currentQuestionGlobalIndex];
    if (q.userAnswer) {
        q.status = STATUS.ANSWERED_MARKED;
    } else {
        q.status = STATUS.MARKED;
    }
    updatePalette();
    if (currentQuestionGlobalIndex < allQuestions.length - 1) {
        loadQuestion(currentQuestionGlobalIndex + 1);
    } else {
        alert("এটি শেষ প্রশ্ন। কুইজ জমা দিন।");
    }
}

function handleClearResponse() {
    const q = allQuestions[currentQuestionGlobalIndex];
    q.userAnswer = null;
    q.status = STATUS.NOT_ANSWERED;
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    updatePalette();
}

// --- কুইজ জমা দেওয়া (আপডেটেড) ---
function showSubmitReview() {
    let answeredCount = 0;
    let notAnsweredCount = 0;
    let markedCount = 0;

    allQuestions.forEach(q => {
        if (q.status === STATUS.ANSWERED) {
            answeredCount++;
        } else if (q.status === STATUS.ANSWERED_MARKED) {
            answeredCount++;
            markedCount++;
        } else if (q.status === STATUS.MARKED) {
            markedCount++;
            notAnsweredCount++;
        } else { // NOT_ANSWERED বা NOT_VISITED
            notAnsweredCount++;
        }
    });

    summaryTotal.textContent = allQuestions.length;
    summaryAnswered.textContent = answeredCount;
    summaryNotAnswered.textContent = notAnsweredCount;
    summaryMarked.textContent = markedCount;

    submitReviewModal.classList.add('active');
}

function handleSubmitQuiz() {
    clearInterval(quizTimerInterval);
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    let finalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    
    allQuestions.forEach(q => {
        if (q.status === STATUS.ANSWERED || q.status === STATUS.ANSWERED_MARKED) {
            if (q.userAnswer === q.answer) {
                correctCount++;
                finalScore += POSITIVE_MARK;
            } else {
                wrongCount++;
                finalScore -= NEGATIVE_MARK;
            }
        } else {
            skippedCount++;
            q.status = 'skipped';
        }

        if (q.userAnswer === q.answer) {
            q.status = 'correct';
        } else if (q.userAnswer !== null) {
            q.status = 'wrong';
        }
    });
    
    const totalPossibleScore = allQuestions.length * POSITIVE_MARK;
    const yourPercentage = (totalPossibleScore > 0) ? (finalScore / totalPossibleScore) * 100 : 0;

    document.getElementById('finalTotalQuestions').textContent = allQuestions.length;
    document.getElementById('correctAnswers').textContent = correctCount;
    document.getElementById('wrongAnswers').textContent = wrongCount;
    document.getElementById('skippedQuestions').textContent = skippedCount;
    document.getElementById('finalScore').textContent = finalScore.toFixed(2);
    document.getElementById('yourPercentage').textContent = yourPercentage.toFixed(2) + '%';

    const percentageBarFill = document.getElementById('percentageBarFill');
    percentageBarFill.style.width = `${yourPercentage}%`;
    percentageBarFill.style.backgroundColor = (yourPercentage >= 50) ? '#28a745' : '#dc3545';

    saveFinalResultToFirebase(finalScore, correctCount, wrongCount, skippedCount, yourPercentage);
    displayRankings();
}

function saveFinalResultToFirebase(score, correct, wrong, skipped, percentage) {
    if (!userName || !quizAttemptKey || !QUIZ_ID) return;
    const resultData = {
        name: userName,
        score: score.toFixed(2),
        correct: correct,
        wrong: wrong,
        skipped: skipped,
        totalQuestions: allQuestions.length,
        percentage: percentage.toFixed(2),
        status: 'complete',
        timestamp: new Date().toISOString()
    };
    database.ref('quizResults/' + QUIZ_ID + '/' + quizAttemptKey).set(resultData)
        .then(() => console.log("চূড়ান্ত ফলাফল সফলভাবে সেভ হয়েছে!"))
        .catch((error) => console.error("ফলাফল সেভ করতে সমস্যা হয়েছে:", error));
}


// --- বাকি সব ফাংশন (লিডারবোর্ড, পার্সোনাল স্কোর, ডিটেইলড আনসার) ---
// (এই ফাংশনগুলি `allQuestions` অ্যারে ব্যবহার করার জন্য সামান্য আপডেটেড)

function displayRankings() { /* ... (অপরিবর্তিত, কারণ এটি শুধু quizResults/QUIZ_ID থেকে ডেটা টানে) ... */ }
function fetchAndShowScores(name) { /* ... (অপরিবর্তিত, কারণ এটি শুধু quizResults/QUIZ_ID থেকে ডেটা টানে) ... */ }

// ইভেন্ট লিসেনার (অপরিবর্তিত)
// showAllAnswersButton.addEventListener('click', () => displayDetailedQuestions('all'));
// ... ইত্যাদি

function displayDetailedQuestions(category) {
    resultSummary.style.display = 'none';
    personalScoresSection.style.display = 'none';
    detailedAnswersContainer.style.display = 'block';
    questionsList.innerHTML = '';
    let titleText = '';
    let filteredQuestions = []; // এখানে allQuestions ব্যবহার হবে

    if (category === 'all') {
        titleText = 'সমস্ত প্রশ্ন ও উত্তর';
        filteredQuestions = allQuestions;
    } else if (category === 'correct') {
        titleText = 'সঠিক উত্তরসমূহ';
        filteredQuestions = allQuestions.filter(q => q.status === 'correct');
    } else if (category === 'wrong') {
        titleText = 'ভুল উত্তরসমূহ';
        filteredQuestions = allQuestions.filter(q => q.status === 'wrong');
    } else if (category === 'skipped') {
        titleText = 'বাদ পড়া প্রশ্নসমূহ';
        filteredQuestions = allQuestions.filter(q => q.status === 'skipped');
    }

    detailedAnswersTitle.textContent = titleText;
    if (filteredQuestions.length === 0) {
        questionsList.innerHTML = `<li>এই ক্যাটাগরিতে কোনো প্রশ্ন নেই।</li>`;
        return;
    }

    filteredQuestions.forEach((q) => {
        const listItem = document.createElement('li');
        listItem.classList.add('detailed-question-item'); 
        let statusClass = '';

        if (q.status === 'correct') statusClass = 'correct-status';
        else if (q.status === 'wrong') statusClass = 'wrong-status';
        else if (q.status === 'skipped') statusClass = 'skipped-status';

        const questionNumber = q.globalIndex + 1; // গ্লোবাল নম্বর

        let questionHtml = `
            <div class="question-header">
                <span class="question-number">${questionNumber}.</span>
                <span class="question-text">${q.question}</span>
                <span class="status-indicator ${statusClass}">${q.status}</span>
            </div>
            <ul class="detailed-options">
        `;

        q.options.forEach(option => {
            let optionClass = '';
            if (q.userAnswer === option) {
                optionClass = (q.status === 'correct') ? 'selected-correct' : 'selected-wrong';
            }
            if (option === q.answer) {
                optionClass += ' correct-answer-highlight';
            }
            questionHtml += `<li class="${optionClass}">${option}</li>`;
        });

        questionHtml += `</ul>`;
        listItem.innerHTML = questionHtml;
        questionsList.appendChild(listItem);
    });
    
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(detailedAnswersContainer, { /* ... (delimiters) ... */ });
    }
}

function backToSummaryScreen() {
    detailedAnswersContainer.style.display = 'none';
    personalScoresSection.style.display = 'none';
    resultSummary.style.display = 'block';
}

// --- পুরানো ফাংশনগুলির সাথে সামঞ্জস্য রাখার জন্য ---
// (কিছু ফাংশন যা fetchAndShowScores বা displayRankings-এর মতো পুরনো কোডে থাকতে পারে, সেগুলি অপরিবর্তিত)

// পুরনো কোড থেকে কপি করা ফাংশন যা validateNameAndStartQuiz ইত্যাদির জন্য প্রয়োজন
function validateNameAndStartQuiz() {
    const inputName = userNameInput.value.trim();
    if (inputName === '') {
        nameInputMessage.textContent = "আপনার নাম লিখুন কুইজ শুরু করার জন্য।";
        return;
    }
    userName = inputName;
    nameInputMessage.textContent = '';
    startQuiz();
}

function validateNameAndShowScores() {
    const inputName = userNameInput.value.trim();
    if (inputName === '') {
        nameInputMessage.textContent = "স্কোর দেখার জন্য আপনার নাম লিখুন।";
        return;
    }
    userName = inputName;
    nameInputMessage.textContent = '';
    fetchAndShowScores(userName);
}

function showNameInputScreen() {
    startScreen.classList.remove('active');
    nameInputScreen.classList.add('active');
}

// রেজাল্ট স্ক্রিনের বাটনগুলির জন্য ইভেন্ট লিসেনার
showAllAnswersButton.addEventListener('click', () => displayDetailedQuestions('all'));
showCorrectAnswersButton.addEventListener('click', () => displayDetailedQuestions('correct'));
showWrongAnswersButton.addEventListener('click', () => displayDetailedQuestions('wrong'));
showSkippedQuestionsButton.addEventListener('click', () => displayDetailedQuestions('skipped'));
backToResultsButton.addEventListener('click', backToSummaryScreen);

// (বাকি helper ফাংশনগুলি যেমন displayRankings, fetchAndShowScores এখানে থাকবে)
function displayRankings() {
    if (!QUIZ_ID) {
        rankListElem.innerHTML = '<li>র‍্যাঙ্কিং লোড করা যায়নি (Quiz ID নেই)।</li>';
        return;
    }
    rankListElem.innerHTML = '<li>র‍্যাঙ্কিং লোড হচ্ছে...</li>';
    document.querySelector('.ranking-section').style.display = 'block';

    database.ref('quizResults/' + QUIZ_ID).once('value', (snapshot) => {
        const userHighestScores = {}; 
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.status !== 'complete') return;
            if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') return; 
            const userScore = parseFloat(data.score);
            if (isNaN(userScore)) return;
            const userName = data.name;
            if (!userHighestScores[userName] || userScore > userHighestScores[userName].score) {
                userHighestScores[userName] = { name: userName, score: userScore };
            }
        });
        const rankings = Object.values(userHighestScores);
        rankings.sort((a, b) => b.score - a.score);
        rankListElem.innerHTML = '';
        if (rankings.length === 0) {
            rankListElem.innerHTML = '<li>এখনো কোনো সম্পূর্ণ কুইজ জমা পড়েনি।</li>';
        } else {
            rankings.forEach((entry, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${index + 1}. ${entry.name} - স্কোর: ${entry.score.toFixed(2)}`;
                rankListElem.appendChild(listItem);
            });
        }
    })
    .catch((error) => {
        console.error("র‍্যাঙ্কিং লোড করতে সমস্যা হয়েছে:", error);
        rankListElem.innerHTML = '<li>র‍্যাঙ্কিং লোড করা যায়নি।</li>';
    });
}

function fetchAndShowScores(name) {
    nameInputScreen.classList.remove('active');
    resultScreen.classList.add('active');
    resultSummary.style.display = 'none';
    detailedAnswersContainer.style.display = 'none';
    personalScoresSection.style.display = 'block';
    // personalScoresTitle.textContent = `${name}-এর পূর্ববর্তী স্কোর`; // এই লাইনটি ত্রুটি দিতে পারে যদি এলিমেন্ট না থাকে
    document.getElementById('personalScoresTitle').textContent = `${name}-এর পূর্ববর্তী স্কোর`;
    personalScoresList.innerHTML = '<li>আপনার স্কোর লোড হচ্ছে...</li>';
    displayRankings(); 

    database.ref('quizResults/' + QUIZ_ID).orderByChild('name').equalTo(name).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            personalScoresList.innerHTML = '<li>এই কুইজে আপনার কোনো স্কোর খুঁজে পাওয়া যায়নি।</li>';
            return;
        }
        const scores = [];
        snapshot.forEach((childSnapshot) => scores.push(childSnapshot.val()));
        scores.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        personalScoresList.innerHTML = '';
        scores.forEach((entry) => {
            const listItem = document.createElement('li');
            const entryDate = new Date(entry.timestamp).toLocaleString('bn-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            let status = entry.status === 'complete' ? 'সম্পূর্ণ' : 'অসম্পূর্ণ';
            listItem.textContent = `স্কোর: ${entry.score} (${status}) - ${entryDate}`;
            personalScoresList.appendChild(listItem);
        });
    }).catch((error) => {
        console.error("স্কোর আনতে সমস্যা হয়েছে:", error);
        personalScoresList.innerHTML = '<li>ত্রুটির কারণে স্কোর লোড করা যায়নি।</li>';
    });
}
