import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  registerUserApi,
  loginUserApi,
  logoutUserApi,
  refreshAccessTokenApi,
} from "@/api/authApi";

const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
};

// Thunks
export const registerUser = createAsyncThunk("auth/register", registerUserApi);
export const loginUser = createAsyncThunk("auth/login", loginUserApi);
export const refreshAccessToken = createAsyncThunk(
  "auth/refresh",
  refreshAccessTokenApi
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().auth.accessToken;
    return await logoutUserApi(token);
  }
);

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, () => {})
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(registerUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(loginUser.pending, () => {
        // Không set isLoading cho login để tránh loading toàn màn hình
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.success
          ? action.payload.accessToken
          : null;
        state.isAuthenticated = action.payload.success;
        state.user = action.payload.success ? action.payload.user : null;
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoading = false;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.success
          ? action.payload.accessToken
          : null;
        state.isAuthenticated = action.payload.success;
        state.user = action.payload.success ? action.payload.user : null;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.isLoading = false;
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearAuth } = authSlice.actions;

export default authSlice.reducer;