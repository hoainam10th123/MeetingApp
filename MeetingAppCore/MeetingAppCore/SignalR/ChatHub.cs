using AutoMapper;
using MeetingAppCore.Dtos;
using MeetingAppCore.Entities;
using MeetingAppCore.Extensions;
using MeetingAppCore.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MeetingAppCore.SignalR
{
    [Authorize]
    public class ChatHub : Hub
    {
        IMapper _mapper;
        //IHubContext<PresenceHub> _presenceHub;
        PresenceTracker _presenceTracker;
        IUnitOfWork _unitOfWork;

        public ChatHub(IMapper mapper, IUnitOfWork unitOfWork, PresenceTracker presenceTracker)
        {
            _mapper = mapper;
            _unitOfWork = unitOfWork;
            _presenceTracker = presenceTracker;
        }

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var roomId = httpContext.Request.Query["roomId"].ToString();
            var roomIdInt = int.Parse(roomId);

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);//khi user click vao room se join vao
            await AddConnectionToGroup(roomIdInt); // luu db DbSet<Connection> de khi disconnect biet

            await _presenceTracker.UserConnected(new UserConnectionInfo(Context.User.GetUsername(), roomIdInt), Context.ConnectionId);

            //lay danh sach user online toi group cua cac user
            var currentUsers = await _presenceTracker.GetOnlineUsers(roomIdInt);
            var usersOnline = await _unitOfWork.UserRepository.GetUsersOnlineAsync(currentUsers);
            var oneUserOnline = await _unitOfWork.UserRepository.GetMemberAsync(Context.User.GetUsername());
            await Clients.Group(roomId).SendAsync("UserOnlineInGroup", usersOnline, oneUserOnline.DisplayName);

            //var messages = await _unitOfWork.MessageRepository.GetMessageThread(Context.User.GetUsername(), otherUser);
            //await Clients.Caller.SendAsync("UserOnlineInGroup", user);
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var group = await RemoveConnectionFromGroup();
            var isOffline = await _presenceTracker.UserDisconnected(new UserConnectionInfo(Context.User.GetUsername(), group.RoomId), Context.ConnectionId);              

            if (isOffline)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, group.RoomId.ToString());
                var temp = await _unitOfWork.UserRepository.GetMemberAsync(Context.User.GetUsername());
                await Clients.Group(group.RoomId.ToString()).SendAsync("UserOfflineInGroup", temp);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(CreateMessageDto createMessageDto)
        {
            var userName = Context.User.GetUsername();
            var sender = await _unitOfWork.UserRepository.GetUserByUsernameAsync(userName);
            
            var group = await _unitOfWork.RoomRepository.GetRoomForConnection(Context.ConnectionId);

            if(group != null)
            {
                var message = new MessageDto
                {
                    SenderUsername = userName,
                    SenderDisplayName = sender.DisplayName,
                    Content = createMessageDto.Content,
                    MessageSent = DateTime.Now
                };
                //Luu message vao db
                //code here
                //send meaasge to group
                await Clients.Group(group.RoomId.ToString()).SendAsync("NewMessage", message);
            }
        }

        public async Task SendSignal(string roomId, MemberDto userC, string signal)
        {
            var user = new UserConnectionInfo(userC.UserName, int.Parse(roomId));
            var conecttions = await _presenceTracker.GetConnectionsForUser(user);
            var caller = await _unitOfWork.UserRepository.GetMemberAsync(Context.User.GetUsername());
            await Clients.Clients(conecttions).SendAsync("OnUserJoined", caller, signal);
        }

        public async Task ReturningSignal(string roomId, MemberDto userCaller, string signal)
        {
            var temp = await _unitOfWork.UserRepository.GetMemberAsync(Context.User.GetUsername());
            var user = new UserConnectionInfo(userCaller.UserName, int.Parse(roomId));
            var conecttions = await _presenceTracker.GetConnectionsForUser(user);            
            await Clients.Clients(conecttions).SendAsync("ReceivingReturnedSignal", temp, signal);
        }

        private async Task<Room> RemoveConnectionFromGroup()
        {
            var group = await _unitOfWork.RoomRepository.GetRoomForConnection(Context.ConnectionId);
            var connection = group.Connections.FirstOrDefault(x => x.ConnectionId == Context.ConnectionId);
            _unitOfWork.RoomRepository.RemoveConnection(connection);

            if (await _unitOfWork.Complete()) return group;

            throw new HubException("Fail to remove connection from room");
        }

        private async Task<Room> AddConnectionToGroup(int roomId)
        {
            var group = await _unitOfWork.RoomRepository.GetRoomById(roomId);
            var connection = new Connection(Context.ConnectionId, Context.User.GetUsername());
            if (group != null)
            {
                group.Connections.Add(connection);
            }

            if (await _unitOfWork.Complete()) return group;

            throw new HubException("Failed to add connection to room");
        }
    }
}
