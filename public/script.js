import { auth, database } from "./init-firebase.js"; // Ensure you import auth and database from init-firebase.js
import { signOut, signInAnonymously, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-auth.js";
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-database.js";

let participants = [];
let colors = [];
let wheelSegments = [];
let userName = '';
let groupName = '';
let cachedData = {}; // 缓存当前组的数据

// 确认按钮的功能
export function confirmUser() {
    // 获取用户名称和组名称
    userName = document.getElementById('userName').value;
    groupName = document.getElementById('groupName').value;

    // 检查是否提供了用户名
    if (!userName) {
        alert('Please enter User Name.');
        return;
    }

    // 注销任何现有用户并匿名登录
    signOut(auth).then(() => {
        return signInAnonymously(auth);
    }).then(() => {
        const user = auth.currentUser;
        return updateProfile(user, { displayName: userName });
    }).then(() => {
        console.log('User authenticated and profile updated.');
        // 初始化组变化的监听器
        listenToGroupChanges();
    }).catch((error) => {
        console.error('Error during authentication:', error);
    });
}
window.confirmUser = confirmUser;

// 监听组变化的函数
function listenToGroupChanges() {
    if (!groupName) {
        groupName = userName; // 如果没有提供组名，则使用用户名作为组名
    }

    const groupRef = ref(database, `groups/${groupName}`);

    onValue(groupRef, (snapshot) => {
        const data = snapshot.val();
        // 比较新数据与缓存数据
        if (JSON.stringify(data) !== JSON.stringify(cachedData)) {
            cachedData = data; // 更新缓存数据
            if (data) {
                document.getElementById('numParticipants').value = data.numParticipants;
                updateParticipantsInputs(data.participants);
                createWheel(false); // 重新绘制转盘，但不更新数据库
                console.log('Group data updated:', data);

                // 如果存在旋转参数，则进行同步旋转
                if (data.spinParams) {
                    spinWheel(data.spinParams);
                }
            } else {
                console.log('No such document!');
            }
        }
    });
}
window.listenToGroupChanges = listenToGroupChanges;

// 更新参与者输入框的函数
function updateParticipantsInputs(participantsData) {
    const participantsInputs = document.getElementById('participantsInputs');
    participantsInputs.innerHTML = '';
    participants = [];
    colors = [];
    wheelSegments = [];

    participantsData.forEach((participant, index) => {
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Name ${index + 1}`;
        nameInput.value = participant.name;
        nameInput.required = true;
        participantsInputs.appendChild(nameInput);

        const probabilityInput = document.createElement('input');
        probabilityInput.type = 'number';
        probabilityInput.placeholder = `Probability ${index + 1} (%)`;
        probabilityInput.min = '0';
        probabilityInput.max = '100';
        probabilityInput.value = participant.probability;
        probabilityInput.required = true;
        participantsInputs.appendChild(probabilityInput);

        participants.push({ nameInput, probabilityInput });
        colors.push(getRandomColor()); // 生成每个参与者的固定颜色
        participantsInputs.appendChild(document.createElement('br'));
    });
}
window.updateParticipantsInputs = updateParticipantsInputs;

// 添加 input 事件监听器
document.getElementById('numParticipants').addEventListener('input', generateInputs);

function generateInputs() {
    const numParticipants = document.getElementById('numParticipants').value;
    const participantsInputs = document.getElementById('participantsInputs');
    participantsInputs.innerHTML = '';
    participants = [];
    colors = [];
    wheelSegments = [];

    for (let i = 0; i < numParticipants; i++) {
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Name ${i + 1}`;
        nameInput.required = true;
        participantsInputs.appendChild(nameInput);

        const probabilityInput = document.createElement('input');
        probabilityInput.type = 'number';
        probabilityInput.placeholder = `Probability ${i + 1} (%)`;
        probabilityInput.min = '0';
        probabilityInput.max = '100';
        probabilityInput.required = true;
        participantsInputs.appendChild(probabilityInput);

        participants.push({ nameInput, probabilityInput });
        colors.push(getRandomColor()); // 生成每个参与者的固定颜色
        participantsInputs.appendChild(document.createElement('br'));
    }
}
window.generateInputs = generateInputs;

function validateInputs() {
    let totalProbability = 0;
    for (const participant of participants) {
        const probability = parseInt(participant.probabilityInput.value);
        if (isNaN(probability)) {
            alert('Please enter valid probabilities.');
            return false;
        }
        totalProbability += probability;
    }
    if (totalProbability !== 100) {
        alert('Total probabilities must add up to 100%.');
        return false;
    }
    return true;
}
window.validateInputs = validateInputs;

// 创建转盘的函数
export function createWheel(updateDatabase = true) {
    if (!validateInputs()) {
        return;
    }

    const numParticipants = document.getElementById('numParticipants').value; // 获取numParticipants的值

    const wheelCanvas = document.getElementById('wheelCanvas');
    const ctx = wheelCanvas.getContext('2d');
    let startAngle = 0;

    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    wheelSegments = [];

    participants.forEach((participant, index) => {
        const probability = parseInt(participant.probabilityInput.value);
        const sliceAngle = (probability / 100) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        // 保存角度范围和参与者以供以后使用
        wheelSegments.push({ startAngle, endAngle, participant });

        ctx.beginPath();
        ctx.moveTo(wheelCanvas.width / 2, wheelCanvas.height / 2);
        ctx.arc(wheelCanvas.width / 2, wheelCanvas.height / 2, wheelCanvas.width / 2, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index];
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(wheelCanvas.width / 2, wheelCanvas.height / 2);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(participant.nameInput.value, wheelCanvas.width / 2 - 20, 10);
        ctx.restore();

        startAngle = endAngle;
    });

    if (updateDatabase) {
        // 保存参与者数据到Firebase Realtime Database
        const db = database;
        const groupRef = ref(database, `groups/${groupName}`);
        const participantsData = participants.map(part => ({
            name: part.nameInput.value,
            probability: parseInt(part.probabilityInput.value)
        }));

        const newData = {
            userName,
            participants: participantsData,
            numParticipants // 将numParticipants的值保存到Firebase数据库
        };

        // 比较新数据与缓存数据
        if (JSON.stringify(newData) !== JSON.stringify(cachedData)) {
            set(groupRef, newData).then(() => {
                console.log('Participants data saved successfully');
                cachedData = newData; // 更新缓存数据
            }).catch(error => {
                console.error('Error saving participants data: ', error);
            });
        }
    }
}
window.createWheel = createWheel;

export function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
window.getRandomColor = getRandomColor;

// 更新的 spinWheel 函数
export function spinWheel(spinParams = null) {
    const wheelCanvas = document.getElementById('wheelCanvas');
    const ctx = wheelCanvas.getContext('2d');

    // 如果没有传入旋转参数，则生成随机旋转参数
    if (!spinParams) {
        spinParams = {
            angle: 0,
            spinTimeTotal: Math.random() * 2000 + 3000, // 旋转时间在3到5秒之间
            spinAngleStart: Math.random() * 10 + 10 // 初始旋转速度
        };
        
        // 将旋转参数保存到数据库
        const groupRef = ref(database, `groups/${groupName}`);
        set(groupRef, { ...cachedData, spinParams }).then(() => {
            console.log('Spin parameters saved successfully');
        }).catch(error => {
            console.error('Error saving spin parameters: ', error);
        });
    }

    let { angle, spinTimeTotal, spinAngleStart } = spinParams;
    let spinTime = spinTimeTotal;

    const drawWheel = () => {
        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
        ctx.save();
        ctx.translate(wheelCanvas.width / 2, wheelCanvas.height / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-wheelCanvas.width / 2, -wheelCanvas.height / 2);

        let startAngle = 0;
        participants.forEach((participant, index) => {
            const probability = parseInt(participant.probabilityInput.value);
            const sliceAngle = (probability / 100) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(wheelCanvas.width / 2, wheelCanvas.height / 2);
            ctx.arc(wheelCanvas.width / 2, wheelCanvas.height / 2, wheelCanvas.width / 2, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.translate(wheelCanvas.width / 2, wheelCanvas.height / 2);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#000';
            ctx.font = '20px Arial';
            ctx.fillText(participant.nameInput.value, wheelCanvas.width / 2 - 20, 10);
            ctx.restore();

            startAngle = endAngle;
        });
        ctx.restore();
    };

    const rotateWheel = () => {
        angle += spinAngleStart * (spinTime / spinTimeTotal); // 逐渐减速
        drawWheel();
        if (spinTime > 0) {
            spinTime -= 16;
            requestAnimationFrame(rotateWheel);
        } else {
            const normalizedAngle = (angle % 360 + 360) % 360; // 将角度标准化为0-360
            const arrowAngle = (270 - normalizedAngle + 360) % 360; // 根据箭头指向下方的270度进行调整
            let selectedParticipant = null;

            for (const segment of wheelSegments) {
                const startDeg = segment.startAngle * (180 / Math.PI);
                const endDeg = segment.endAngle * (180 / Math.PI);
                if (startDeg <= arrowAngle && arrowAngle < endDeg) {
                    selectedParticipant = segment.participant;
                    break;
                }
            }

            if (selectedParticipant) {
                document.getElementById('result').innerText = `Winner: ${selectedParticipant.nameInput.value}`;
            }
        }
    };

    rotateWheel();
}
window.spinWheel = spinWheel;

function shareScreenshotToFacebook() {
    const shareElement = document.querySelector('.wheel-container'); // 要截圖的元素
    html2canvas(shareElement).then(canvas => {
        const imageDataUrl = canvas.toDataURL('image/png'); // 生成截圖的 base64 圖片
        const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageDataUrl)}`;
        window.open(facebookShareUrl, '_blank'); // 打開 Facebook 分享窗口
    }).catch(err => {
        console.error('Failed to capture screenshot:', err);
    });
}

window.shareScreenshotToFacebook = shareScreenshotToFacebook; // 綁定函數
