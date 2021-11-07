import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Instance } from 'simple-peer';
import { threadId } from 'worker_threads';
import { Member } from '../models/member';
import { PeerData } from '../models/peer-data';
import { UserPeer } from '../models/userPeer';

declare var SimplePeer: any;

@Injectable({
  providedIn: 'root'
})
export class RtcService {

  private onSignalToSendSource = new Subject<PeerData>();
  onSignalToSend$ = this.onSignalToSendSource.asObservable();

  private returningSignalSource = new Subject<PeerData>();
  returningSignal$ = this.returningSignalSource.asObservable();

  currentPeer: Instance;
  peers: UserPeer[] = [];

  constructor() { }

  //trickle: true, peer gan nhat ket noi truoc
  createPeer(stream, user: Member): Instance {
    const peer = new SimplePeer({ initiator: true, stream });
    // kich hoat dau tien
    peer.on('signal', data => {
      const stringData = JSON.stringify(data);
      this.onSignalToSendSource.next({ user: user, data: stringData });
    });

    //Received a remote video stream
    //peer.on('stream', data => {});

    // peer.on('connect', () => {
    //   this.onConnectSource.next({ userName: username, data: null });
    // });

    // chat text, nhan tin nhan tu remote peer
    // peer.on('data', data => {
    //   this.onData.next({ id: username, data });
    // });
    // peer.on('close', () => {
    //   console.log("createPeer: peer connection has closed")
    // })

    return peer;
  }

  addPeer(userCaller: Member, signal: string, stream: any) {
    const signalObject = JSON.parse(signal);
    const peer = new SimplePeer({ initiator: false, stream });
    peer.on("signal", data => {
      const stringData = JSON.stringify(data);
      this.returningSignalSource.next({ user: userCaller, data: stringData })
    })
    peer.signal(signalObject);
    const userPeer = this.peers.some(x=>x.member.userName === userCaller.userName)
    if(!userPeer){
      this.peers.push({member: userCaller, peer})
    }
  }
}
