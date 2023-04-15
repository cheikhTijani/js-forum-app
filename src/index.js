'use strict';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, onSnapshot, addDoc, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';


// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";

// import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// import { getFirestore, collection, getDocs, onSnapshot, addDoc, Timestamp, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "API_KEY",
    authDomain: "opinions-23699.firebaseapp.com",
    projectId: "opinions-23699",
    storageBucket: "opinions-23699.appspot.com",
    messagingSenderId: "605296572878",
    appId: "1:605296572878:web:81bc054d0e6e6c8e08539f",
    measurementId: "G-1ZVY48QF2Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();


/************************************/
// AUTH //
/************************************/

// Sign in existing users
const loginForm = document.querySelector('.login');
const loginFormEmail = document.querySelector('#loginEmail');
const loginErr = document.querySelector('.login-error');

const loginCredentials = async (e) => {
    e.preventDefault();
    const loginEmail = loginForm.loginEmail.value.trim();
    const loginPassword = loginForm.loginPassword.value.trim();

    if (!loginFormEmail || !loginPassword) return;
    try {
        loginErr.textContent = '';
        loginErr.classList.add('d-none');
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        // clear form
        loginForm.reset();

    } catch (error) {
        console.log('Error: ', error.message);
        loginErr.classList.remove('d-none');
        loginErr.innerHTML = `Invalid email or/and password. Try again`;
    }
};

loginForm.addEventListener('submit', loginCredentials);


// sign up new user
const signUpForm = document.querySelector('.signUp');
const signUpFormEmail = document.querySelector('#signUpEmail');
const signUpError = document.querySelector('.signUp-error');

const SignUpCredentials = async (e) => {
    e.preventDefault();
    const signUpUsername = signUpForm.signUpUsername.value.trim();
    const signUpEmail = signUpForm.signUpEmail.value.trim();
    const signUpPassword = signUpForm.signUpPassword.value.trim();
    const cpassword = signUpForm.cpassword.value.trim();

    if (signUpUsername.length > 3 && signUpFormEmail.validity.valid && signUpPassword.length >= 8 && signUpPassword === cpassword) {
        signUpError.textContent = '';

        try {
            const createCredentials = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
            localStorage.setItem("user", signUpUsername);
            const newUser = {
                username: localStorage.getItem("user"),
                uid: localStorage.getItem("uid")
            }
            await addDoc(collection(db, 'users'), newUser);
            // clear form
            signUpForm.reset();
        } catch (error) {
            signUpError.textContent = error.message;
            console.log('Error: ', error.message);
        }

    } else {
        signUpError.textContent = 'Form data is not valid. Try again';
        console.log("Form data is not valid. Try again");
    }

};

signUpForm.addEventListener('submit', SignUpCredentials);

// redirect to signup if user doesn't have an account
const signUpLink = document.querySelector('.signUpLink');

signUpLink.addEventListener('click', () => {
    loginForm.classList.add('d-none');
    signUpForm.classList.remove('d-none');
});


// Implement logout
const btnLogout = document.querySelector('.btnLogout');
const logout = async function () {
    await signOut(auth);
    // clear local
    newUI?.clear();
    localStorage.clear();
    newForm.classList.add('d-none');
}
btnLogout.addEventListener('click', logout);

// Monitor Auth state
const monitorAuthState = async () => {
    onAuthStateChanged(auth, async user => {
        if (user) {

            localStorage.setItem("uid", user.uid);

            // get current user username
            const q = query(collection(db, 'users'), where("uid", "==", `${user.uid}`), limit(1));
            const queryy = await getDocs(q);
            queryy.forEach(document => {
                localStorage.setItem("user", document.data().username);
            });

            // hide forms
            loginForm.classList.add('d-none');
            signUpForm.classList.add('d-none');
            // show logout btn
            btnLogout.classList.remove('d-none');
            // show topics
            topics.classList.remove('d-none');
        } else {
            // show login form
            loginForm.classList.remove('d-none');
            // hide topics
            topics.classList.add('d-none');
            // hide logout btn
            btnLogout.classList.add('d-none');
            // clear local
            if (newUI) newUI.clear();
            localStorage.clear();
            newForm.classList.add('d-none');
        }
    });
}
monitorAuthState();



/************************************/
// POST CLASS //
/************************************/

class Post {

    constructor(topic) {
        this.topic = topic;
        this.opinions = collection(db, 'opinions');
        this.unsub;
    }

    // add post
    async addPost(subject, message) {
        // format a post object
        const now = new Date();
        const post = {
            subject,
            message,
            topic: this.topic,
            username: localStorage.getItem("user"),
            created_at: Timestamp.fromDate(now)
        };
        // save post
        try {
            const response = await addDoc(this.opinions, post);
            return response;
        } catch (err) {
            throw new Error(err);
        }
    }


    // get posts (real time listeners)
    getPosts(callback) {
        const q = query(this.opinions, where('topic', '==', this.topic), orderBy('created_at'));
        this.unsub = onSnapshot(q, querySnapshot => {
            querySnapshot.docChanges().forEach(change => {
                const doc = change.doc;
                if (change.type === 'added') {
                    // update UI
                    callback(doc.data());
                }
            })
        })
    }

    // update topic
    updateTopic(topic) {
        this.topic = topic;
        if (this.unsub) this.unsub();
    }
};


/************************************/
// UI CLASS //
/************************************/
class RenderUI {

    constructor(list) {
        this.list = list;
    }

    // clear data
    clear() {
        this.list.innerHTML = '';
    }

    // render data on UI
    render(data) {
        const when = dateFns.distanceInWordsToNow(
            data.created_at.toDate(),
            { addSuffix: true }
        );
        const html = `
        <li class="list-group-item">
          <span class="subject"><strong>${data.subject}</strong></span>
          <div class="message">${data.message}</div>
          <div class="time text-muted">
            <i>${when}</i>
            <span class="username">
              <small>by <b>${data.username}</b></small>
            </span>
          </div>
        </li>
        `;

        this.list.innerHTML += html;
    }


};



/************************************/
// DOM QUERIES //
/************************************/
const postsList = document.querySelector('.post-list');
const newForm = document.querySelector('.new-post');
const topics = document.querySelector('.topics');
const topicBtns = topics.querySelectorAll('.btn');


/************************************/
// ADD FORM POSTS //
/************************************/
newForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const subject = newForm.subject.value.trim();
    const message = newForm.message.value.trim();
    newPost.addPost(subject, message).then(() => newForm.reset()).catch(err => console.log(err));
});



/************************************/
// CHANGE TOPICS //
/************************************/
let newPost;
let newUI;
let btnTopic;

topics.addEventListener('click', function (e) {

    topicBtns.forEach(btn => {
        if (btn.classList.contains('selected'))
            btn.classList.remove('selected');
    });

    if (e.target.tagName === 'BUTTON') {
        e.target.classList.add('selected');
        btnTopic = e.target.getAttribute('id');
        // create class instances
        if (!newPost) {
            newPost = new Post(btnTopic);
            newUI = new RenderUI(postsList);
            newPost.getPosts(data => newUI.render(data));
            newForm.classList.remove('d-none');
        } else {
            newUI.clear();
            newPost.updateTopic(btnTopic);
            newPost.getPosts(post => newUI.render(post));
        }
    }
});

