import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { Room } from '../models/room';

@Injectable({
  providedIn: 'root'
})
export class UtilityStreamService {
  private roomSource = new ReplaySubject<Room>(1);
  room$ = this.roomSource.asObservable();

  private roomEditSource = new ReplaySubject<Room>(1);
  roomEdit$ = this.roomEditSource.asObservable();

  constructor() { }

  set Room(value: Room) {
    this.roomSource.next(value);
  }

  set RoomEdit(value: Room) {
    this.roomEditSource.next(value);
  }
}
