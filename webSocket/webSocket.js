import { wsUrl } from "./base.js"    // 基本信息文件
import store from "./../store/index"
import Parser from "common/xmldom"
import { getNetworkType } from "@/utils/wxApi.js"
const DOMParser = Parser.DOMParser
class WebSocket {
    constructor (wsUrl) {
        this.wsUrl = wsUrl
        this.socketOpen = false     // 是否已经连接上了 socket
        this.socketMsgQueue = []    // 消息队列
        this.pinkTime = 50000;
		this.connectTimes = 0;			// 重连次数
		this.isconnectSucc = true;		// 是否连接成功
		this.offLineTimes = 0;          // 断网重连次数
		this.isRunToGame = 0,		// 是否轮到游戏
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
		// ++this.connectTimes;
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
        global._logger.writeLogs(`创建WEBSOCKET连接`);
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
            global._logger.writeLogs(`关闭webSocket连接`);
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
        global._logger.writeLogs(`发送 WebSocket，信息：${msg}`);
    }

    // 心跳
    setPink () {
        clearTimeout(global.WSPink)
        global.WSPink = null
        global.WSPink = setTimeout(() => {
            this.sendSocketMessage(`<iq id="${new Date().getTime()}" type="set" from="${store.getters.userId}" to="ping.mk"><ping xmlns="urn:xmpp:ping"/></iq>`)
            global._logger.writeLogs(`WebSocket心跳`);
        }, this.pinkTime)
    }

    // 监听 WebSocket 连接打开事件
    onSocketOpen () {
        return res => {
            this.socketOpen = true
            // 开流(连接到IM)
            this.sendSocketMessage(`<stream:stream sessionId="${store.getters.sessionId}" xmlns:stream="http://etherx.jabber.org/streams"/>`)
            clearTimeout(global.intervalCreateWS)
            global.intervalCreateWS = null
            this.socketMsgQueue.forEach(msg => {
                this.sendSocketMessage(msg)
            })
            this.socketMsgQueue = []
			this.isconnectSucc = true;
			this.connectTimes = 0;
			this.offLineTimes = 0;
        }
    }

    //  监听 WebSocket 接受到服务器的消息事件
    socketMessage () {
        return async res => {
            this.setPink()
            const domParser = new DOMParser().parseFromString(res.data,"text/xml");
			// 系统消息
            if (res.data.indexOf("message") !== -1) { 
				global._logger.writeLogs(`系统消息。服务器消息：`, JSON.stringify(res.data));
			} else { // ping 或者其他消息
                global._logger.writeLogs(`或者其他消息。服务器消息：`,res.data);
            }
        }
    }

    // 监听 WebSocket 错误事件
    socketError () {
        return res => {
            this.socketOpen = false;
			this.isconnectSucc = false;
            this.reconnection()
            global._logger.writeLogs(`WebSocket 错误重连`);
			// console.log("WebSocket 错误重连");
        }
    }

    // 监听 WebSocket 连接关闭事件
    socketClose () {
        return res => {
            // 状态码 1000 属于H5正常关闭
            this.socketOpen = false;
			this.isconnectSucc = false;
            global._logger.writeLogs(`WebSocket 关闭重连`, JSON.stringify(res));
            if (res.code !== 1000) {
                this.reconnection()
            }
        }
    }

    // 重连
    reconnection () {
        clearTimeout(global.intervalCreateWS)
        global.intervalCreateWS = null;
		// 重连测试叠加，刚开始
        if (!global.intervalCreateWS) {
            this.reconnectionErrFunc();
        } else {
            global._logger.writeLogs(`WebSocket 重连成功`);
        }
    }
	
	// 重连失败处理事件
	reconnectionErrFunc() {
		global.intervalCreateWS = setTimeout(async () => {
			++this.connectTimes;
			// 重连时判断用户网络情况，如果三次网络异常就直接关闭ws，非网络问题定时器延长时间，20次关闭ws
			let networkType = 1;
			try{
				networkType = await getNetworkType();
			} catch(err) {
				console.log("err", err)
			}
			if(networkType !== 1) {
				uni.showToast({
					title: `断网了,请切换网络`,
					icon: "none",
					duration: 2000
				})
				++this.offLineTimes;
				this.connectTimes = 0;
				if(this.offLineTimes >= 3) {
					this.offLineTimes = 0;
					clearTimeout(global.intervalCreateWS);
					this.closeWS();
					store.commit("setNetWorkErr", true);
					console.log("wsoffLineTimes超出三次");
					return;
				}
			} else {
				// 适当延长定时周期
				if(this.connectTimes >= 20){
					uni.showToast({
						title: `网络异常,请检查`,
						icon: "none",
						duration: 2000
					})
					this.offLineTimes = 0;
					this.connectTimes = 0;
					clearTimeout(global.intervalCreateWS);
					this.closeWS();
					store.commit("setNetWorkErr", true);
					console.log("重连失败处理事件超出20次");
					return;
				}
			}
			this.createWS()
		}, 3000)
	}
}



const webSocket = new WebSocket(wsUrl)
export default webSocket