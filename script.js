
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAimQq7wGk-tBdwGUY31YNlI9tz2TfNGcw",
  authDomain: "task-manager-using-firebase.firebaseapp.com",
  projectId: "task-manager-using-firebase",
  storageBucket: "task-manager-using-firebase.firebasestorage.app",
  messagingSenderId: "85912702242",
  appId: "1:85912702242:web:6b6fbc881e17f33eab297b",
  measurementId: "G-39VMDQ73MJ"

};

// 2. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase Connected Successfully!");

// 3. HTML ELEMENTS
const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const authTitle = document.getElementById("authTitle");
const authButton = document.getElementById("authButton");
const switchAuth = document.getElementById("switchAuth");
const authMessage = document.getElementById("authMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

let isRegister = false;
let currentUser = null;
let tasks = [];
let activeFilter = "all";
let unsubscribeTasks = null;

// 4. REGISTER / LOGIN SWITCH
switchAuth.addEventListener("click", (event) => {
    event.preventDefault();

    isRegister = !isRegister;

    authTitle.textContent = isRegister
        ? "Create Your Account"
        : "Welcome Back!";

    authButton.textContent = isRegister
        ? "Register"
        : "Login";

    switchAuth.textContent = isRegister
        ? "Login Here"
        : "Create Account";

    authMessage.textContent = "";
});

// 5. AUTHENTICATION
authButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authMessage.textContent = "Enter email and password.";
        return;
    }

    if (password.length < 6) {
        authMessage.textContent = "Password must be at least 6 characters.";
        return;
    }

    authButton.disabled = true;
    authMessage.textContent = "Please wait...";

    try {
        if (isRegister) {
            await createUserWithEmailAndPassword(
                auth, email, password
            );
        } else {
            await signInWithEmailAndPassword(
                auth, email, password
            );
        }

        authMessage.textContent = "";

    } catch (error) {
        authMessage.textContent = error.message;
    } finally {
        authButton.disabled = false;
    }
});

// 6. AUTH STATE
onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
    }

    if (user) {
        authSection.hidden = true;
        dashboard.hidden = false;

        document.getElementById("userEmail").textContent =
            user.email;

        loadTasks(user.uid);

    } else {
        authSection.hidden = false;
        dashboard.hidden = true;
        tasks = [];
        renderTasks();
    }
});

// 7. LOGOUT
document.getElementById("logoutBtn").addEventListener(
    "click", async () => {
        await signOut(auth);
    }
);

// 8. ADD TASK
addTaskBtn.addEventListener("click", async () => {
    const title = taskInput.value.trim();
    const priority = priorityInput.value;
    const dueDate = dueDateInput.value;

    if (!title) {
        alert("Please enter a task!");
        return;
    }

    if (!currentUser) return;

    addTaskBtn.disabled = true;

    try {
        await addDoc(
            collection(db, "tasks"),
            {
                title: title,
                priority: priority,
                dueDate: dueDate,
                completed: false,
                userId: currentUser.uid,
                createdAt: serverTimestamp()
            }
        );

        taskInput.value = "";
        dueDateInput.value = "";
        priorityInput.value = "Low";

    } catch (error) {
        alert("Could not add task: " + error.message);
    } finally {
        addTaskBtn.disabled = false;
    }
});

// 9. LOAD TASKS FROM FIRESTORE
function loadTasks(userId) {
    const q = query(
        collection(db, "tasks"),
        where("userId", "==", userId)
    );

    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        tasks = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data()
        }));

        renderTasks();

    }, (error) => {
        console.error("Firestore error:", error);
        alert("Unable to load tasks: " + error.message);
    });
}

// 10. RENDER TASKS
function renderTasks() {
    taskList.innerHTML = "";

    const total = tasks.length;
    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;

    const progress = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("progress").textContent =
        progress + "%";

    const filteredTasks = tasks.filter(task => {
        if (activeFilter === "pending") {
            return !task.completed;
        }

        if (activeFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    if (filteredTasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent = "No tasks found. Add your first task!";
        taskList.appendChild(empty);
        return;
    }

    filteredTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";

        if (task.completed) {
            item.classList.add("completed");
        }

        const details = document.createElement("div");
        details.className = "task-details";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const date = document.createElement("p");
        date.textContent = task.dueDate
            ? "Due: " + task.dueDate
            : "No due date";

        details.append(title, date);

        const badge = document.createElement("span");
        badge.className = "priority " +
    ["High", "Medium", "Low"].includes(task.priority)
        ? task.priority : "Low";
        const actions = document.createElement("div");
        actions.className = "task-actions";

        const completeBtn = document.createElement("button");
        completeBtn.className = "complete-btn";
        completeBtn.textContent = task.completed ? "Undo" : "Done";

        completeBtn.addEventListener("click", () => {
            updateTask(task.id, {
                completed: !task.completed
            });
        });

        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";

        editBtn.addEventListener("click", () => {
            editTask(task);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";

        deleteBtn.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.append(completeBtn, editBtn, deleteBtn);
        item.append(details, badge, actions);

        taskList.appendChild(item);
    });
}

// 11. UPDATE TASK
async function updateTask(id, data) {
    try {
        await updateDoc(doc(db, "tasks", id), data);
    } catch (error) {
        alert("Update failed: " + error.message);
    }
}

// 12. EDIT TASK
async function editTask(task) {
    const newTitle = prompt("Edit task name:", task.title);

    if (newTitle === null || !newTitle.trim()) return;

    const newPriority = prompt(
        "Enter priority: High, Medium or Low",
        task.priority || "Low"
    );

    if (newPriority === null) return;

    const normalizedPriority =
        newPriority.trim().toLowerCase();

    const priorities = {
        high: "High",
        medium: "Medium",
        low: "Low"
    };

    if (!priorities[normalizedPriority]) {
        alert("Please enter High, Medium or Low.");
        return;
    }

    await updateTask(task.id, {
        title: newTitle.trim(),
        priority: priorities[normalizedPriority]
    });
}

// 13. DELETE TASK
async function deleteTask(id) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, "tasks", id));
    } catch (error) {
        alert("Delete failed: " + error.message);
    }
}

// 14. SIDEBAR FILTERS
document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;

        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        renderTasks();

        document.querySelector(".task-section h2").textContent =
            activeFilter === "pending" ? "Pending Tasks" :
            activeFilter === "completed" ? "Completed Tasks" :
            "My Tasks";
    });
});
