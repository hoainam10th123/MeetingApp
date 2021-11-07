import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TabDirective } from 'ngx-bootstrap/tabs';
import { Subscription } from 'rxjs';
import { eMeet } from 'src/app/models/eMeeting';
import { Member } from 'src/app/models/member';
import { Message } from 'src/app/models/message';
import { PeerData } from 'src/app/models/peer-data';
import { SignalInfo } from 'src/app/models/signalr-infor';
import { User } from 'src/app/models/user';
import { UserPeer } from 'src/app/models/userPeer';
import { AccountService } from 'src/app/_services/account.service';
import { ChatHubService } from 'src/app/_services/chat-hub.service';
import { MessageCountStreamService } from 'src/app/_services/message-count-stream.service';
import { RtcService } from 'src/app/_services/rtc.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  isMeeting = false;
  membersInGroup: Member[] = [];
  messageInGroup: Message[] = [];
  currentRoomId = 0;
  currentUser: User;
  subscriptions = new Subscription();
  statusScreen: eMeet;
  chatForm: FormGroup;
  messageCount = 0;
  @ViewChild('videoPlayer') localvideoPlayer: ElementRef;

  //peers: UserPeer[] = [];

  constructor(private chatHub: ChatHubService,
    public rtcService: RtcService,
    private route: ActivatedRoute,
    private messageCountService: MessageCountStreamService,
    private accountService: AccountService) {
    this.accountService.currentUser$.subscribe(user => {
      this.currentUser = user;
    })
  }

  //chan khong cho tat trinh duyet khi o trang edit nay
  @HostListener('window:beforeunload', ['$event']) unloadNotification($event: any) {
    if (this.isMeeting) {
      $event.returnValue = true;
    }
  }

  roomId: string;

  ngOnInit(): void {
    this.khoiTaoForm()
    this.onLoadVideoLocalStream()
    this.statusScreen = eMeet.ONESCREEN
    this.roomId = this.route.snapshot.paramMap.get('id')
    this.chatHub.createHubConnection(this.currentUser, Number.parseInt(this.roomId))

    this.subscriptions.add(
      this.chatHub.onlineUsers$.subscribe(members => {
        this.membersInGroup = members;
        this.rtcService.peers = [];
        //this.membersInGroup = this.membersInGroup.filter(x => x.userName !== this.currentUser.userName);

        this.membersInGroup.forEach(member => {
          const peer = this.rtcService.createPeer(this.stream, member)
          this.rtcService.peers.push({peer, member})
        })

      })
    );

    this.subscriptions.add(
      this.chatHub.messagesThread$.subscribe(messages => {
        this.messageInGroup = messages;
      })
    );

    //hien thi so tin nhan chua doc
    this.subscriptions.add(
      this.messageCountService.messageCount$.subscribe(value => {
        this.messageCount = value;
      })
    );

    this.subscriptions.add(this.rtcService.onSignalToSend$.subscribe((data: PeerData) => {
      this.chatHub.sendSignalToUser(this.roomId, data.user, data.data);
    }));

    this.subscriptions.add(this.chatHub.userJoined$.subscribe((signalData: SignalInfo) => {
      this.rtcService.addPeer(signalData.user, signalData.signal, this.stream);
    }));

    this.subscriptions.add(this.rtcService.returningSignal$.subscribe((data: PeerData)=>{
      this.chatHub.returningSignal(this.roomId, data.user, data.data);
    }));

    this.subscriptions.add(this.chatHub.receivingReturnedSignal$.subscribe((signalData: SignalInfo)=>{
      let userPeer = this.rtcService.peers.find(x=>x.member.userName === signalData.user.userName)      
      userPeer.peer.signal(JSON.parse(signalData.signal));
    }));
  }
  
  stream: any;
  enableVideo = true;
  enableAudio = false;

  async onLoadVideoLocalStream() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: this.enableVideo, audio: this.enableAudio });    
    } catch (error) {
      console.error(`Can't join room, error ${error}`);
      alert(`Can't join room, error ${error}`);
    }
  }

  enableOrDisableVideo(){
    this.enableVideo = !this.enableVideo
    if(this.stream.getVideoTracks()[0]){
      this.stream.getVideoTracks()[0].enabled = this.enableVideo;
    }
  }

  enableOrDisableAudio(){
    this.enableAudio = !this.enableAudio;
    if(this.stream.getAudioTracks()[0]){
      this.stream.getAudioTracks()[0].enabled = this.enableAudio;
    }
  }

  onSelect(data: TabDirective): void {
    if (data.heading == "Chat") {
      this.messageCountService.ActiveTabChat = true;
      this.messageCountService.MessageCount = 0;
      this.messageCount = 0;
    } else {
      this.messageCountService.ActiveTabChat = false;
    }
  }

  khoiTaoForm() {
    this.chatForm = new FormGroup({
      content: new FormControl('', Validators.required)
    })
  }

  sendMessage() {
    this.chatHub.sendMessage(this.chatForm.value.content).then(()=>{
      this.chatForm.reset();
    })
  }

  ngOnDestroy() {
    this.chatHub.stopHubConnection()
    this.subscriptions.unsubscribe();
  }
}
