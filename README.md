# 🧠 SmartLearn AI - Chrome Extension

SmartLearn AI is an intelligent Chrome extension designed to enhance learning from online content, especially YouTube. It tracks user activity, analyzes learning behavior, and provides AI-powered tools such as quizzes and insights to improve retention and productivity.

---

## 🚀 Features

- Tracks learning activity on YouTube  
- AI-powered analysis of user behavior  
- Generates quizzes for revision  
- Displays insights using charts  
- Sends notifications and reminders  
- Provides personalized learning experience  

---

## 🏗️ Project Structure

smartlearn-extension/
│
├── manifest.json  
├── background.js  
├── content.js  
├── ml-service.js  
│
├── popup.html  
├── popup.js  
├── popup.css  
│
├── overlay.html  
├── quiz.html  
├── quiz.js  
│
├── icon.png  
│
└── libs/  
    ├── bootstrap.min.css  
    ├── bootstrap.bundle.min.js  
    ├── chart.min.js  
    ├── fontawesome.min.css  

---

## ⚙️ Installation Guide

1. Download or clone this repository  
2. Extract the ZIP file  
3. Open Google Chrome and go to:  
   chrome://extensions/  
4. Enable Developer Mode  
5. Click "Load unpacked"  
6. Select the project folder  

Extension will be installed successfully.

---

## 🔑 Permissions Used

- storage – Store user learning data  
- alarms – Schedule reminders  
- notifications – Display alerts  
- activeTab – Access current tab  
- scripting – Inject scripts into webpages  

---

## 🌐 Supported Platform

- YouTube (via content script)

---

## 🤖 AI Integration

The extension uses AI/ML logic to:
- Analyze user learning patterns  
- Generate quizzes automatically  
- Provide smart recommendations  

Note: Add your API key in ml-service.js if required.

---

## 📊 Libraries Used

- Bootstrap – UI design  
- Chart.js – Data visualization  
- Font Awesome – Icons  

---

## 🧪 How It Works

1. Tracks YouTube activity using content.js  
2. Stores interaction data locally  
3. Processes data using ML logic (ml-service.js)  
4. Displays insights and quizzes in popup and UI  

---

## 📌 Future Enhancements

- Support for platforms like Coursera and Udemy  
- Advanced AI recommendations  
- User authentication system  
- Cloud data synchronization  

---

## 👨‍💻 Author

Developed as part of an academic AI/ML project.

---

## 📄 License

This project is for educational purposes only.
