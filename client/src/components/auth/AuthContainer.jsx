import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContainer = ({ loginForm, registerForm, isLoginPage }) => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(!isLoginPage);

  // Handle toggle with URL update
  const handleToggle = (newState) => {
    setIsActive(newState);
    setTimeout(() => {
      navigate(newState ? "/auth/register" : "/auth/login", { replace: true });
    }, 1700);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div
        className={`relative w-[850px] h-[550px] bg-white m-5 rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-1000 ${
          isActive ? "active" : ""
        }`}
      >
        {loginForm(isActive)}
        {registerForm(isActive)}

        {/* Toggle Box */}
        <div className="absolute w-full h-full pointer-events-none">
          {/* Animated Background */}
          <div
            className={`absolute ${
              isActive ? "left-1/2" : "-left-[250%]"
            } w-[300%] h-full bg-primary rounded-[150px] z-20 transition-all duration-[1000ms] ease-in-out`}
          ></div>

          {/* Toggle Left Panel */}
          <div
            className={`absolute ${
              isActive ? "-left-1/2 delay-[400ms]" : "left-0 delay-[700ms]"
            } w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[400ms] ease-in-out pointer-events-auto`}
          >
            <h1 className="text-4xl -mt-2.5 mb-0 font-bold">Xin Chào!</h1>
            <p className="text-sm my-4 mb-5">Chưa có tài khoản?</p>
            <button
              onClick={() => handleToggle(true)}
              className="w-40 h-[46px] bg-transparent border-2 border-white rounded-lg shadow-none cursor-pointer text-base text-white font-semibold hover:bg-white hover:text-primary transition-colors"
            >
              Đăng Ký
            </button>
          </div>

          {/* Toggle Right Panel */}
          <div
            className={`absolute ${
              isActive ? "right-0 delay-[700ms]" : "-right-1/2 delay-[400ms]"
            } w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[400ms] ease-in-out pointer-events-auto`}
          >
            <h1 className="text-4xl -mt-2.5 mb-0 font-bold">
              Chào Mừng Trở Lại!
            </h1>
            <p className="text-sm my-4 mb-5">Đã có tài khoản?</p>
            <button
              onClick={() => handleToggle(false)}
              className="w-40 h-[46px] bg-transparent border-2 border-white rounded-lg shadow-none cursor-pointer text-base text-white font-semibold hover:bg-white hover:text-primary transition-colors"
            >
              Đăng Nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
