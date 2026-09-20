import { ApiError } from '@/lib/api';

const GAME_API_URL = process.env.NEXT_PUBLIC_GAME_API_URL ?? 'http://localhost:5002';

export type Member = {
  user_id: string;
  username: string;
};

export type RoomSummary = {
  id: string;
  name: string;
  capacity: number;
  member_count: number;
};

export type RoomDetail = {
  id: string;
  name: string;
  capacity: number;
  host_id: string;
  designated_successor_id: string | null;
  members: Member[];
};

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GAME_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'Request failed');
  }
  return data as T;
}

export function browseRooms(token: string) {
  return request<RoomSummary[]>('/rooms', token);
}

export function createRoom(token: string, name: string, capacity: number) {
  return request<RoomDetail>('/rooms', token, {
    method: 'POST',
    body: JSON.stringify({ name, capacity }),
  });
}

export function getRoom(token: string, roomId: string) {
  return request<RoomDetail>(`/rooms/${roomId}`, token);
}

export function joinRoom(token: string, roomId: string) {
  return request<RoomDetail>(`/rooms/${roomId}/join`, token, { method: 'POST' });
}

export function leaveRoom(token: string, roomId: string) {
  return request<RoomDetail | null>(`/rooms/${roomId}/leave`, token, { method: 'POST' });
}

export function designateSuccessor(token: string, roomId: string, userId: string) {
  return request<RoomDetail>(`/rooms/${roomId}/designate-successor`, token, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export { GAME_API_URL };
