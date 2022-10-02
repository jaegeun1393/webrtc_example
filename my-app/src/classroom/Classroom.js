import React, { useEffect, useState, useRef, isValidElement } from "react";
import { useParams } from "react-router-dom";
import io from 'socket.io-client';
import Peer from "simple-peer";
import "./remove_scroll.css";
import axios from "axios";

const serverUrl = "http://localhost:8080";
const peer = new Peer("pick-an-id");

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", stream => {
      ref.current.srcObject = stream;
    })
  }, []);

  return (
    <video muted className="w-full rounded-2xl mb-2" autoPlay playsInline style={{ width: "400px" }} ref={ref} />
  );
}

function Classroom() {
  const [uid, setuid] = useState(Math.floor(Math.random() * (10 - 1 + 1)) + 1);
  const { id } = useParams(); //room id

  //chat
  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");
  const [messageList, setMessageList] = useState([]);
  //Send file
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  //video streaming
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = id;
  const [streamcam, setstreamcam] = useState(false);

  useEffect(() => {
    socketRef.current = io.connect(serverUrl);
    socketRef.current.emit("join_chat_room", roomID);
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
      userVideo.current.srcObject = stream;
      socketRef.current.emit("join room", roomID);
      socketRef.current.on("all users", users => {
        const peers = [];
        users.forEach(userID => {
          const peer = createPeer(userID, socketRef.current.id, stream);
          peersRef.current.push({
            peerID: userID,
            peer,
          })
          peers.push(peer);
        })
        setPeers(peers);
      })

      socketRef.current.on("user joined", payload => {
        const peer = addPeer(payload.signal, payload.callerID, stream);
        peersRef.current.push({
          peerID: payload.callerID,
          peer,
        })

        setPeers(users => [...users, peer]);
      });

      socketRef.current.on("receiving returned signal", payload => {
        const item = peersRef.current.find(p => p.peerID === payload.id);
        item.peer.signal(payload.signal);
      });

      socketRef.current.on("receive_message", data => {
        console.log(data);
        setMessageReceived(data.uid + ": " + data.message);
        let newMessage = data.uid + ": " + data.message;

        setMessageList(oldMessage => [...oldMessage, newMessage]);
      });
    })
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
    })

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    })

    peer.on("signal", signal => {
      socketRef.current.emit("returning signal", { signal, callerID })
    })

    peer.signal(incomingSignal);

    return peer;
  }

  //chat
  const sendMessage = () => {
    if (selectedFile != null) {
      uploadFile().then(val => {
        let newMessage = uid + ": " + "[" + val + "]";
        socketRef.current.emit("send_message", { message: "[" + val + "]", id, uid });
        setMessageList(oldMessage => [...oldMessage, newMessage]);
        setSelectedFile(null);
      });

      return;
    } else {
      socketRef.current.emit("send_message", { message, id, uid });
      let newMessage = uid + ": " + message;

      setMessageList(oldMessage => [...oldMessage, newMessage]);
      document.getElementById("chatText").value = '';
      setMessage('');
    }
  };

  const uploadFile = async (e) => {
    document.getElementById('fileUploadElement').value = null

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", fileName);
    try {
      const res = await axios.post(serverUrl + "/upload", formData);
      console.log("= ", selectedFile.name);
      return "uploads/get/" + selectedFile.name;
    } catch (ex) {
      console.log(ex);
    }
  };

  const onFileChange = (event) => {
    setFileName(event.target.files[0].name);
    setSelectedFile(event.target.files[0]);
  };

  const extractMessage = (orginalMessageLine) => {
    let message = orginalMessageLine.substring(orginalMessageLine.indexOf(':') + 1)

    if (message.includes('[') && message.includes(']')) {
      let imgName =
        message.substring(
          message.indexOf("[") + 1,
          message.lastIndexOf("]")
        );
      let imgUrl = serverUrl + "/" + imgName;
      return <a href={imgUrl} target="_blank" rel="noopener noreferrer"> {imgName}</a>;
    }
    return message;
  };
  //screen share
  function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
      userVideo.current.srcObject = stream;


    })
  }
  return (
    <div className="bg-[#D5D5D5]">
      <section>
        <div className="flex flex-1 h-screen w-full m-auto">
          <div className="container ml-3 mt-5">
            <div className="max-h-full h-full flex flex-row gap-8">
              <div className="flex flex-col w-3/4 w-full h-full ">
                <div className="flex flex-col justify-between w-full h-full bg-white rounded-lg p-2 relative">
                  <div className="flex justify-end gap-1.5">
                    <span
                      className="w-9 h-9 flex justify-center items-center hover:bg-black rounded-full border border-gray-300 p-1.5 hover:text-white ease-linear duration-200 focus:bg-black focus:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" viewBox="0 0 24 24"
                        width="24" height="24">
                        <path fill="none" d="M0 0h24v24H0z" />
                        <path
                          d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z" />
                      </svg>
                    </span>
                    <span
                      className="w-9 h-9 flex justify-center items-center hover:bg-black rounded-full border border-gray-300 p-1.5 hover:text-white ease-linear duration-200 focus:bg-black focus:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" viewBox="0 0 24 24"
                        width="24" height="24">
                        <path fill="none" d="M0 0h24v24H0z" />
                        <path
                          d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.535a1 1 0 0 1 0 1.414l-7.779 7.779-2.12.707-1.415 1.414a1 1 0 0 1-1.414 0l-4.243-4.243a1 1 0 0 1 0-1.414l1.414-1.414.707-2.121 7.779-7.779a1 1 0 0 1 1.414 0l5.657 5.657zm-6.364-.707l1.414 1.414-4.95 4.95-1.414-1.414 4.95-4.95zM4.283 16.89l2.828 2.829-1.414 1.414-4.243-1.414 2.828-2.829z" />
                      </svg>
                    </span>
                    <span
                      className="w-9 h-9 flex justify-center items-center hover:bg-black rounded-full border border-gray-300 p-1.5 hover:text-white ease-linear duration-200 focus:bg-black focus:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" viewBox="0 0 24 24"
                        width="24" height="24">
                        <path fill="none" d="M0 0h24v24H0z" />
                        <path
                          d="M5 11.1l2-2 5.5 5.5 3.5-3.5 3 3V5H5v6.1zm0 2.829V19h3.1l2.986-2.985L7 11.929l-2 2zM10.929 19H19v-2.071l-3-3L10.929 19zM4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm11.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                      </svg>
                    </span>
                    <span
                      className="w-9 h-9 flex justify-center items-center hover:bg-black rounded-full border border-gray-300 p-1.5 hover:text-white ease-linear duration-200 focus:bg-black focus:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" viewBox="0 0 24 24"
                        width="24" height="24">
                        <path fill="none" d="M0 0h24v24H0z" />
                        <path
                          d="M21 15h-7v7H3.998C3.447 22 3 21.545 3 21.008V2.992C3 2.444 3.445 2 3.993 2h16.014A1 1 0 0 1 21 3.007V15zm0 2l-5 4.997V17h5z" />
                      </svg>
                    </span>
                  </div>
                  <div className="absolute top-[30%] left-0">
                    <div className="flex gap-1">
                      <div className=" flex flex-col gap-1">
                        <span
                          className="w-6 h-6 rounded-full hover:ring-1 hover:ring-gray-700 hover:border border-white bg-black block"></span>
                        <span
                          className="w-6 h-6 rounded-full hover:ring-1 hover:ring-gray-700 hover:border border-white bg-blue-800 block"></span>
                        <span
                          className="w-6 h-6 rounded-full hover:ring-1 hover:ring-gray-700 hover:border border-white bg-red-500 block"></span>
                      </div>
                      <div className=" flex flex-col items-center gap-0.5">
                        <span className="text-xs text-gray-700 cursor-default">A</span>
                        <span className="text-md text-gray-700 cursor-default">A</span>
                        <span className="text-lg text-gray-700 cursor-default">A</span>
                        <span className="w-[17px] h-[1px] bg-gray-700 rounded-3xl mb-2"></span>
                        <span className="w-[17px] h-1 bg-gray-700 rounded-3xl mb-2"></span>
                        <span className="w-[17px] h-1.5 bg-gray-700 rounded-3xl mb-2"></span>
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className="fill-current text-gray-700" viewBox="0 0 24 24" width="24"
                            height="24">
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                              d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z" />
                          </svg>
                        </span>
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className="fill-current text-gray-700" viewBox="0 0 24 24" width="24"
                            height="24">
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                              d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z" />
                          </svg>
                        </span>
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className="fill-current text-gray-700" viewBox="0 0 24 24" width="24"
                            height="24">
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                              d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className=" flex items-center justify-end">

                    <div aria-label="Page">
                      <ul className="inline-flex items-center ">
                        <li>
                          <a href="#"
                            className="block py-2  ml-0 leading-tight bg-white rounded-l-lg border-gray-300 hover:bg-gray-100 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                              width="24" height="24">
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path
                                d="M10.828 12l4.95 4.95-1.414 1.414L8 12l6.364-6.364 1.414 1.414z" />
                            </svg>
                          </a>
                        </li>
                        <li>
                          <a href="#"
                            className="py- px-3 w-9 h-9 leading-tight bg-white  text-xl font-semibold">1</a>
                        </li>
                        <li>
                          <a href="#"
                            className="py- px-3 leading-tight bg-white  text-xl font-semibold">2</a>
                        </li>
                        <li>
                          <a href="#"
                            className="py- px-3 leading-tight bg-white  text-xl font-semibold">3</a>
                        </li>
                        <li>
                          <a href="#" className="block py-2  leading-tight bg-white rounded-r-lg ">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                              width="24" height="24">
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path
                                d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
                            </svg>
                          </a>
                        </li>
                        <li>
                          <span className="flex-grow-0 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg"
                              className="text-gray-700 fill-current" viewBox="0 0 24 24"
                              width="48" height="48">
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
                            </svg>
                          </span>
                        </li>
                      </ul>
                    </div>

                  </div>
                </div>

                <div className="flex justify-center gap-5 my-5">
                  <span
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-full  bg-white text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path
                        d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z">
                      </path>
                    </svg>
                  </span>
                  <span
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-full  bg-white text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path
                        d="m7.727 6.313-4.02-4.02-1.414 1.414 18 18 1.414-1.414-2.02-2.02A9.578 9.578 0 0 0 21.999 12c0-4.091-2.472-7.453-5.999-9v2c2.387 1.386 3.999 4.047 3.999 7a8.13 8.13 0 0 1-1.671 4.914l-1.286-1.286C17.644 14.536 18 13.19 18 12c0-1.771-.775-3.9-2-5v7.586l-2-2V2.132L7.727 6.313zM4 17h2.697L14 21.868v-3.747L3.102 7.223A1.995 1.995 0 0 0 2 9v6c0 1.103.897 2 2 2z">
                      </path>
                    </svg>
                  </span>
                  <button
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-full  bg-white text-gray-700"
                    onClick={shareScreen}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path
                        d="M18 7c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-3.333L22 17V7l-4 3.333V7z">
                      </path>
                    </svg>
                  </button>
                  <span
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-xl  bg-red-500 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path
                        d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4z">
                      </path>
                      <path
                        d="M11 19.931V22h2v-2.069c3.939-.495 7-3.858 7-7.931h-2c0 3.309-2.691 6-6 6s-6-2.691-6-6H4c0 4.072 3.061 7.436 7 7.931z">
                      </path>
                    </svg>
                  </span>
                  <span
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-full  bg-white text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path
                        d="M20.5 5A1.5 1.5 0 0 0 19 6.5V11h-1V4.5a1.5 1.5 0 0 0-3 0V11h-1V3.5a1.5 1.5 0 0 0-3 0V11h-1V5.5a1.5 1.5 0 0 0-3 0v10.81l-2.22-3.6a1.5 1.5 0 0 0-2.56 1.58l3.31 5.34A5 5 0 0 0 9.78 22H17a5 5 0 0 0 5-5V6.5A1.5 1.5 0 0 0 20.5 5z">
                      </path>
                    </svg>
                  </span>
                  <span
                    className="w-[60px] h-[60px] flex justify-center items-center rounded-full  bg-white text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="fill-current" width="26" height="26">
                      <path d="M10 4H8v4H4v2h6zM8 20h2v-6H4v2h4zm12-6h-6v6h2v-4h4zm0-6h-4V4h-2v6h6z">
                      </path>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="flex flex-col w-1/4 w-full h-full max-h-full">

                <div className="grid columns-auto overflow-auto no-scrollbar" style={{ height: "800px" }}>
                  <video muted ref={userVideo} className="w-full rounded-2xl mb-2" autoPlay playsInline style={{ width: "400px" }} />
                  {peers.map((peer, index) => {
                    return (
                      <Video key={index} peer={peer} />
                    );
                  })}

                  {/* <div
                    className="bg-[#374557] w-full py-12 px-8 text-center text-white text-3xl font-bold rounded-2xl mb-4">
                    <span>Video Chat</span>
                  </div> */}

                </div>

                <div className="absolute bottom-0">
                  <div className="bg-gray-200 p-4 font-bold text-3xl">
                    <span>Live Chat</span>
                  </div>
                  <div className="p-3 overflow-y-scroll h-full bg-white">
                    <table>
                      <tbody>
                        {messageList.map((item, key) =>
                          <div>
                            <div key={key} className="flex justify-start mb-3">
                              <div>
                                <div className="flex flex-col gap-1 text-left space-y-5 w-full ">
                                  <div>
                                    <h4 className="text-sm font-bold mb-1 text-gray-700">{item.substring(0, item.indexOf(':'))}</h4>
                                    <span
                                      className="text-xs p-2 rounded-lg bg-[#F4F4F5] text-[#626a75] inline-block">
                                      {extractMessage(item)}
                                    </span>
                                    <p className="text-gray-400 text-left text-[10px] font-semibold my-1">
                                      <time>12:45</time>
                                      PM
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-3 w-full bg-white mb-24">

                    <form>
                      <div className="relative">
                        <textarea type="search" id="chatText" rows="1"
                          className="block p-2 pl-3 w-full text-xs text-gray-900 bg-gray-100 rounded-lg border-2 border-gray-300 outline-none"
                          required=""
                          onChange={(event) => {
                            setMessage(event.target.value);
                          }}
                        />
                        <div className=" absolute top-[5px] right-2.5 flex gap-2 items-center">

                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18"
                              height="16">
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path
                                d="M17.657 14.828l-1.414-1.414L17.657 12A4 4 0 1 0 12 6.343l-1.414 1.414-1.414-1.414 1.414-1.414a6 6 0 0 1 8.485 8.485l-1.414 1.414zm-2.829 2.829l-1.414 1.414a6 6 0 1 1-8.485-8.485l1.414-1.414 1.414 1.414L6.343 12A4 4 0 1 0 12 17.657l1.414-1.414 1.414 1.414zm0-9.9l1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z"
                                fill="rgba(115,121,122,1)" />
                            </svg>
                          </span>

                          <button onClick={sendMessage} disabled={message === '' && selectedFile == null}
                            type="button" className="text-white bg-[#374557] hover:bg-[#2e3a49] font-medium rounded-lg text-sm px-2.5 py-1
                          text-center inline-flex items-center outline-none">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18"
                              height="18">
                              <path fill="none" d="M0 0h24v24H0z" />
                              <path
                                d="M3 13h6v-2H3V1.846a.5.5 0 0 1 .741-.438l18.462 10.154a.5.5 0 0 1 0 .876L3.741 22.592A.5.5 0 0 1 3 22.154V13z"
                                fill="rgba(236,240,241,1)" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <input type="file" id="fileUploadElement" onChange={onFileChange} />
                    </form>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
    </div>);
}

export default Classroom;
