import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UserPeer } from 'src/app/models/userPeer';

@Component({
  selector: 'app-video-box-user',
  templateUrl: './video-box-user.component.html',
  styleUrls: ['./video-box-user.component.css']
})
export class VideoBoxUserComponent implements OnInit {
  @Input() userPeer: UserPeer;

  @ViewChild('videoPlayerUser') videoPlayer: ElementRef;

  constructor() { }

  ngOnInit(): void {
    this.userPeer.peer.on('stream', stream => {
      this.videoPlayer.nativeElement.srcObject = stream;
      this.videoPlayer.nativeElement.load();
      this.videoPlayer.nativeElement.play();
    });
  }
}
