import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { axiosPrivate } from "./axios";
import { clearAuth, refreshAccessToken } from "@/store/auth-slice";

// Simple module-scoped guard to avoid multiple concurrent refreshes
let isRefreshing = false;
let refreshSubscribers = [];
let authBlockedLogoutRunning = false;

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const useAxiosPrivate = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const forceLogoutForBlockedAccount = (payload = {}) => {
    if (authBlockedLogoutRunning) return;
    authBlockedLogoutRunning = true;
    dispatch(clearAuth());
    delete axiosPrivate.defaults.headers.common.Authorization;
    toast.error(payload.message || "Tài khoản của bạn đã bị khóa. Vui lòng đăng nhập lại sau.");
    navigate("/auth/login", { replace: true });
    setTimeout(() => {
      authBlockedLogoutRunning = false;
    }, 1000);
  };

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers["Authorization"] && accessToken) {
          config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => {
        const responseData = response?.data || {};
        const payload = responseData.data || responseData;
        if (payload?.user_banned || payload?.banned || payload?.disabled) {
          forceLogoutForBlockedAccount(payload);
        }
        return response;
      },
      async (error) => {
        const prevRequest = error?.config;
        const errorData = error?.response?.data || {};
        const errorPayload = errorData.data || errorData;

        if (
          error?.response?.status === 403 &&
          (errorPayload?.banned || errorPayload?.user_banned || errorPayload?.disabled)
        ) {
          forceLogoutForBlockedAccount(errorPayload);
          return Promise.reject(error);
        }

        if (
          error?.response?.status === 401 &&
          !prevRequest?.sent &&
          !prevRequest.url.includes("/refresh-token")
        ) {
          prevRequest.sent = true;

          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const res = await dispatch(refreshAccessToken()).unwrap();
              console.debug(
                "Refresh succeeded, new accessToken:",
                res.accessToken
              );
              isRefreshing = false;
              onRefreshed(res.accessToken);
              prevRequest.headers[
                "Authorization"
              ] = `Bearer ${res.accessToken}`;
              return axiosPrivate(prevRequest);
            } catch (err) {
              console.debug("Refresh failed:", err);
              isRefreshing = false;
              onRefreshed(null);
              return Promise.reject(err);
            }
          }

          // If refresh is already in progress, queue this request
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              if (!token) return reject(error);
              prevRequest.headers["Authorization"] = `Bearer ${token}`;
              resolve(axiosPrivate(prevRequest));
            });
          });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, dispatch, navigate]);

  return axiosPrivate;
};

export default useAxiosPrivate;
