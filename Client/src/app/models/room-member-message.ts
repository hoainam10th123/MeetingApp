import { Member } from "./member";
import { Message } from "./message";

// khong xai den
export class RoomMemberMessage {
    roomId: number;
    members: Member[] = [];
    messages: Message[] = [];

    constructor(_roomId: number){
        this.roomId = _roomId;
        //this.members = [];
        //this.messages = [];
    }

    addMemberToRoom(member: Member){
        this.members.push(member);
    }

    addMessageToRoom(message: Message){
        this.messages.push(message);
    }
}