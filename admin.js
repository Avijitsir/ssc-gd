// আপনার Firebase প্রোজেক্ট কনফিগারেশন
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

// --- DOM Elements ---
const quizIdInput = document.getElementById('quiz-id-input');
const quizTitleInput = document.getElementById('quiz-title-input');

const sectionNameInput = document.getElementById('section-name-input');
const addSectionBtn = document.getElementById('add-section-btn');
const sectionList = document.getElementById('section-list');
const sectionSelectDropdown = document.getElementById('section-select-dropdown');
const bulkSectionSelectDropdown = document.getElementById('bulk-section-select-dropdown');

const questionTextInput = document.getElementById('question-text-input');
const option1Input = document.getElementById('option1-input');
const option2Input = document.getElementById('option2-input');
const option3Input = document.getElementById('option3-input');
const option4Input = document.getElementById('option4-input');
const answerInput = document.getElementById('answer-input');
const addQuestionBtn = document.getElementById('add-question-btn');

const bulkInputTextarea = document.getElementById('bulk-input-textarea');
const processBulkBtn = document.getElementById('process-bulk-btn');

const questionsListHeader = document.getElementById('questions-list-header');
const quizPreviewList = document.getElementById('quiz-preview-list');
const saveQuizBtn = document.getElementById('save-quiz-btn');
const statusMessage = document.getElementById('status-message');

// --- নতুন ডেটা স্ট্রাকচার ---
let currentQuizData = {
    title: "",
    sections: [] // { title: "SectionName", questions: [...] }
};

// --- ইভেন্ট লিসেনার ---
addSectionBtn.addEventListener('click', addSection);
addQuestionBtn.addEventListener('click', addQuestionToSection);
processBulkBtn.addEventListener('click', processBulkInput);
saveQuizBtn.addEventListener('click', saveQuizToFirebase);

// --- সেকশন ম্যানেজমেন্ট ---
function addSection() {
    const sectionName = sectionNameInput.value.trim();
    if (sectionName === "") {
        showStatus("Error: সেকশনের নাম লিখুন।", "error");
        return;
    }

    const sectionExists = currentQuizData.sections.some(sec => sec.title === sectionName);
    if (sectionExists) {
        showStatus("Error: এই নামে সেকশন 이미 রয়েছে।", "error");
        return;
    }

    const newSection = {
        title: sectionName,
        questions: []
    };

    currentQuizData.sections.push(newSection);
    
    updateSectionUI(); // UI আপডেট করুন
    sectionNameInput.value = '';
    showStatus(`সেকশন '${sectionName}' যোগ করা হয়েছে।`, "success");
}

function updateSectionUI() {
    sectionList.innerHTML = '';
    sectionSelectDropdown.innerHTML = '';
    bulkSectionSelectDropdown.innerHTML = '';

    if (currentQuizData.sections.length === 0) {
        sectionSelectDropdown.innerHTML = '<option value="">আগে সেকশন তৈরি করুন</option>';
        sectionSelectDropdown.disabled = true;
        bulkSectionSelectDropdown.innerHTML = '<option value="">আগে সেকশন তৈরি করুন</option>';
        bulkSectionSelectDropdown.disabled = true;
    } else {
        currentQuizData.sections.forEach((sec, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${sec.title}`;
            sectionList.appendChild(li);

            const option = document.createElement('option');
            option.value = index; // ইনডেক্স দিয়ে সেকশন খুঁজে বের করা হবে
            option.textContent = sec.title;
            
            sectionSelectDropdown.appendChild(option.cloneNode(true));
            bulkSectionSelectDropdown.appendChild(option.cloneNode(true));
        });
        sectionSelectDropdown.disabled = false;
        bulkSectionSelectDropdown.disabled = false;
    }
    
    updateQuizPreview();
}

// --- প্রশ্ন ম্যানেজমেন্ট ---
function addQuestionToSection() {
    const selectedSectionIndex = sectionSelectDropdown.value;
    if (selectedSectionIndex === "") {
        showStatus("Error: একটি সেকশন সিলেক্ট করুন।", "error");
        return;
    }

    const questionText = questionTextInput.value.trim();
    const option1 = option1Input.value.trim();
    const option2 = option2Input.value.trim();
    const option3 = option3Input.value.trim();
    const option4 = option4Input.value.trim();
    const answer = answerInput.value.trim();

    if (!questionText || !option1 || !option2 || !option3 || !option4 || !answer) {
        showStatus("Error: সবগুলি ফিল্ড পূরণ করুন।", "error");
        return;
    }

    const newQuestion = {
        question: questionText,
        options: [option1, option2, option3, option4],
        answer: answer
    };

    currentQuizData.sections[selectedSectionIndex].questions.push(newQuestion);

    updateQuizPreview();
    clearQuestionForm();
    showStatus(`প্রশ্নটি '${currentQuizData.sections[selectedSectionIndex].title}' সেকশনে যোগ করা হয়েছে।`, "success");
}

function processBulkInput() {
    const selectedSectionIndex = bulkSectionSelectDropdown.value;
    if (selectedSectionIndex === "") {
        showStatus("Error: বাল্ক প্রশ্ন যোগ করার জন্য একটি সেকশন সিলেক্ট করুন।", "error");
        return;
    }

    const rawText = bulkInputTextarea.value.trim();
    if (!rawText) {
        showStatus("Error: পেস্ট করার জন্য বক্সে কোনো লেখা নেই।", "error");
        return;
    }

    const questionBlocks = rawText.split(/\n\s*\n/);
    let addedCount = 0;
    let errorCount = 0;

    questionBlocks.forEach((block, index) => {
        const lines = block.trim().split('\n');
        if (lines.length === 6) {
            const questionText = lines[0].trim();
            const option1 = lines[1].trim();
            const option2 = lines[2].trim();
            const option3 = lines[3].trim();
            const option4 = lines[4].trim();
            
            if (lines[5].trim().startsWith("Answer: ")) {
                const answer = lines[5].trim().substring(8).trim();
                const newQuestion = {
                    question: questionText,
                    options: [option1, option2, option3, option4],
                    answer: answer
                };

                currentQuizData.sections[selectedSectionIndex].questions.push(newQuestion);
                addedCount++;
            } else { errorCount++; }
        } else if (lines.length > 0 && lines[0] !== "") { errorCount++; }
    });

    if (addedCount > 0) {
        updateQuizPreview();
        bulkInputTextarea.value = '';
        showStatus(`সফল! ${addedCount} টি প্রশ্ন '${currentQuizData.sections[selectedSectionIndex].title}' সেকশনে যোগ করা হয়েছে।`, "success");
    }
    if (errorCount > 0) {
        showStatus(`${errorCount} টি প্রশ্নের ফরম্যাটে ভুল ছিল।`, "error");
    }
}

// --- প্রিভিউ এবং সেভ ---
function updateQuizPreview() {
    quizPreviewList.innerHTML = '';
    const sectionCount = currentQuizData.sections.length;
    questionsListHeader.textContent = `৫. কুইজ প্রিভিউ (${sectionCount} টি সেকশন)`;

    currentQuizData.sections.forEach((sec, index) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('preview-section-item');
        
        const questionCount = sec.questions.length;
        sectionDiv.innerHTML = `<strong>${index + 1}. ${sec.title}</strong> (${questionCount} টি প্রশ্ন)`;
        quizPreviewList.appendChild(sectionDiv);
    });
}

function saveQuizToFirebase() {
    const quizId = quizIdInput.value.trim();
    const quizTitle = quizTitleInput.value.trim();

    if (!quizId) { showStatus("Error: Quiz ID দিন।", "error"); return; }
    if (!quizTitle) { showStatus("Error: Quiz Title দিন।", "error"); return; }
    if (currentQuizData.sections.length === 0) {
        showStatus("Error: অন্তত একটি সেকশন তৈরি করুন।", "error");
        return;
    }
    
    // চেক করুন কোনো সেকশনে প্রশ্ন যোগ করা হয়েছে কিনা
    const hasQuestions = currentQuizData.sections.some(sec => sec.questions.length > 0);
    if (!hasQuestions) {
        showStatus("Error: অন্তত একটি সেকশনে প্রশ্ন যোগ করুন।", "error");
        return;
    }

    currentQuizData.title = quizTitle;

    showStatus("কুইজ সেভ করা হচ্ছে...", "success");
    database.ref('quizzes/' + quizId).set(currentQuizData)
        .then(() => {
            showStatus(`সফল! কুইজ '${quizId}' Firebase-এ সেভ হয়ে গেছে।`, "success");
            resetAdminPanel();
        })
        .catch((error) => {
            showStatus(`Error: ${error.message}`, "error");
        });
}

function resetAdminPanel() {
    quizIdInput.value = '';
    quizTitleInput.value = '';
    currentQuizData = { title: "", sections: [] };
    updateSectionUI();
}

function clearQuestionForm() {
    questionTextInput.value = '';
    option1Input.value = '';
    option2Input.value = '';
    option3Input.value = '';
    option4Input.value = '';
    answerInput.value = '';
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`; // 'success' বা 'error'
    
    // ৩ সেকেন্ড পর মেসেজটি মুছে ফেলুন
    setTimeout(() => {
        if (statusMessage.textContent === message) {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }
    }, 3000);
}