import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { axiosPrivate } from "./axios";
import { refreshAccessToken } from "@/store/auth-slice";

// Simple module-scoped guard to avoid multiple concurrent refreshes
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const useAxiosPrivate = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth.accessToken);

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
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;

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
  }, [accessToken, dispatch]);

  return axiosPrivate;
};

export default useAxiosPrivate;
