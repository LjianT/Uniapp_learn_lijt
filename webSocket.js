import { wsUrl } from "./base.js"    // 基本信息文件
import store from "./../store/index"
class WebSocket {
    constructor (wsUrl) {
        this.wsUrl = wsUrl
        this.socketOpen = false     // 是否已经连接上了 socket
        this.socketMsgQueue = []    // 消息队列
        this.pinkTime = 50000;
		this.isconnectSucc = true;		// 是否连接成功
		// 抖音下编译
		// #ifdef MP-TOUTIAO
			this.bytedanceSocketTask = uni.getStorageSync("bytedanceSocketTask") || null; //抖音链接socket的实例
		// #endif
		// 除抖音外都编译
		// #ifndef MP-TOUTIAO
			// 监听 WebSocket 连接打开事件
			uni.onSocketOpen(this.onSocketOpen())
			//  监听 WebSocket 接受到服务器的消息事件
			uni.onSocketMessage(
				this.socketMessage()
			)
			// 监听 WebSocket 错误事件
			uni.onSocketError(this.socketError())
			// 监听 WebSocket 连接关闭事件
			uni.onSocketClose(this.socketClose())
		// #endif
    }

    // 创建WEBSOCKET连接
    createWS () {
		// 抖音下编译
		// #ifdef MP-TOUTIAO
			this.bytedanceSocketTask = tt.connectSocket({
				url: `${this.wsUrl}?sid=${store.getters.sessionId}`, // Socket url
			})
			uni.setStorageSync("bytedanceSocketTask", this.bytedanceSocketTask)
			// 监听 WebSocket 连接打开事件
			this.bytedanceSocketTask.onOpen(this.onSocketOpen());
			//  监听 WebSocket 接受到服务器的消息事件
			this.bytedanceSocketTask.onMessage(
				this.socketMessage()
			)
			// 监听 WebSocket 错误事件
			this.bytedanceSocketTask.onError(this.socketError())
			// 监听 WebSocket 连接关闭事件
			this.bytedanceSocketTask.onClose(this.socketClose())
		// #endif
		// 除抖音外都编译
		// #ifndef MP-TOUTIAO
			uni.connectSocket({
				url: `${this.wsUrl}?sid=${store.getters.sessionId}` // Socket url
			})
		// #endif
		store.commit("setNetWorkErr", false);
        global.logManager.writeLogs(`创建WEBSOCKET连接`);
    }

    // 关闭 WebSocket 连接
    closeWS () {
        if (this.socketOpen) {
			// 抖音下编译
			// #ifdef MP-TOUTIAO
				if(!!this.bytedanceSocketTask) {
					this.bytedanceSocketTask.close();
				}
			// #endif
			// 除抖音外都编译
			// #ifndef MP-TOUTIAO
			uni.closeSocket();
			// #endif	
            global.logManager.writeLogs(`关闭webSocket连接`);
        }
    }

    // 发送 WebSocket
    sendSocketMessage (msg) {
        if (this.socketOpen) {
			// 抖音下编译
			// #ifdef MP-TOUTIAO
			this.bytedanceSocketTask.send({
				data: `${msg}\n`
			})
			// #endif
			// 除抖音外都编译
			// #ifndef MP-TOUTIAO
			uni.sendSocketMessage({
		        data: `${msg}\n`
			})
			// #endif	
        } else {
            this.socketMsgQueue.push(msg)
            this.reconnection()
        }
        global.logManager.writeLogs(`发送 WebSocket，信息：${msg}`);
    }

    // 心跳
    setPink () {
        clearTimeout(global.WSPink)
        global.WSPink = null
        global.WSPink = setTimeout(() => {
            this.sendSocketMessage(`<iq id="${new Date().getTime()}" type="set" from="${store.getters.userId}" to="ping.mk"><ping xmlns="urn:xmpp:ping"/></iq>`)
            global.logManager.writeLogs(`WebSocket心跳`);
        }, this.pinkTime)
    }

    // 监听 WebSocket 连接打开事件
    onSocketOpen () {
        return res => {
            this.socketOpen = true
            // 开流(连接到IM)
            this.sendSocketMessage(`<stream:stream sessionId="${store.getters.sessionId}" xmlns:stream="http://etherx.jabber.org/streams"/>`)
            this.socketMsgQueue.forEach(msg => {
                this.sendSocketMessage(msg)
            })
            this.socketMsgQueue = []
			this.isconnectSucc = true;
        }
    }

    //  监听 WebSocket 接受到服务器的消息事件
    socketMessage () {
        return async res => {
            this.setPink()
            global.logManager.writeLogs(`消息事件：`, JSON.stringify(res.data));
        }
    }

    // 监听 WebSocket 错误事件
    socketError () {
        return res => {
            this.socketOpen = false;
			this.isconnectSucc = false;
            this.reconnection()
            global.logManager.writeLogs(`WebSocket 错误重连`);
			// console.log("WebSocket 错误重连");
        }
    }

    // 监听 WebSocket 连接关闭事件
    socketClose () {
        return res => {
            // 状态码 1000 属于H5正常关闭
            this.socketOpen = false;
			this.isconnectSucc = false;
            global.logManager.writeLogs(`WebSocket 关闭重连`, JSON.stringify(res));
            if (res.code !== 1000) {
                this.reconnection()
            }
        }
    }

    // 重连
    reconnection () {
        this.createWS()
        global.logManager.writeLogs(`WebSocket 重连`);
    }
}



const webSocket = new WebSocket(wsUrl)
export default webSocket