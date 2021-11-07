import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Member } from '../models/member';
import { Message } from '../models/message';
import { PeerData } from '../models/peer-data';
import { SignalInfo } from '../models/signalr-infor';
import { User } from '../models/user';
import { MessageCountStreamService } from './message-count-stream.service';

@Injectable({
  providedIn: 'root'
})
export class ChatHubService {

  hubUrl = environment.hubUrl;
  private hubConnection: HubConnection;

  private onlineUsersSource = new BehaviorSubject<Member[]>([]);
  onlineUsers$ = this.onlineUsersSource.asObservable();

  private messagesThreadSource = new BehaviorSubject<Message[]>([]);
  messagesThread$ = this.messagesThreadSource.asObservable();

  private userJoinedSource = new Subject<SignalInfo>();
  userJoined$ = this.userJoinedSource.asObservable();

  private receivingReturnedSignalSource = new Subject<SignalInfo>();
  receivingReturnedSignal$ = this.receivingReturnedSignalSource.asObservable();

  constructor(private toastr: ToastrService, private messageCount: MessageCountStreamService) { }

  createHubConnection(user: User, roomId: number){
    
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(this.hubUrl+ 'chathub?roomId=' + roomId, {
      accessTokenFactory: ()=> user.token
    }).withAutomaticReconnect().build()

    this.hubConnection.start().catch(err => console.log(err));

    // this.hubConnection.on('ReceiveMessageThread', messages => {
    //   this.messageThreadSource.next(messages);
    // })  

    this.hubConnection.on('NewMessage', message => {
      if(this.messageCount.activeTabChat){
        this.messageCount.MessageCount = 0;
      }else{
        this.messageCount.MessageCount += 1
      }
      this.messagesThread$.pipe(take(1)).subscribe(messages => {
        this.messagesThreadSource.next([...messages, message])        
      })
    })

    this.hubConnection.on('UserOnlineInGroup', (users: Member[], displayName: string) => {
      this.onlineUsersSource.next(users);
      this.toastr.success(displayName + ' has join room!')
    })

    this.hubConnection.on('UserOfflineInGroup', (user: Member) => {
      this.onlineUsers$.pipe(take(1)).subscribe(users => {
        this.onlineUsersSource.next([...users.filter(x => x.userName !== user.userName)])
      })
      this.toastr.warning(user.displayName + ' has left room!')
    })

    this.hubConnection.on('OnUserJoined', (user: Member, signal: string) => {
      this.userJoinedSource.next({user, signal})
    })

    this.hubConnection.on('ReceivingReturnedSignal', (user: Member, signal: string) => {
      this.receivingReturnedSignalSource.next({user, signal})
    })
  }

  stopHubConnection(){
    if(this.hubConnection){
      this.hubConnection.stop().catch(error => console.log(error));
    }
  }

  async sendMessage(content: string){    
    return this.hubConnection.invoke('SendMessage', {content})
      .catch(error => console.log(error));
  }

  async sendSignalToUser(roomId: string, user: Member, signal: string) {
    return this.hubConnection.invoke('SendSignal', roomId, user, signal).catch(error => console.log(error));
  }

  async returningSignal(roomId: string, userCaller: Member, signal: string) {
    return this.hubConnection.invoke('ReturningSignal', roomId, userCaller, signal).catch(error => console.log(error));
  }
}
