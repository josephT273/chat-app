import { useActionState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/AuthContext";
import { type SignInActionState, signIn } from "@/lib/actions";

export default function Login() {
  const [state, action] = useActionState<SignInActionState, FormData>(
    signIn,
    {},
  );

  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.user) {
      setUser(state.user);
      navigate("/");
    }
  }, [state.user]);

  return (
    <form action={action} className="bg-white p-10 border">
      <div className="mt-2">
        <label htmlFor="email">Email</label>
        <Input
          type="email"
          id="email"
          name="email"
          defaultValue={state.email}
        />
        {state.errors?.email?.map((e) => (
          <p key={e} className="text-sm text-red-500">
            {e}
          </p>
        ))}
      </div>
      <div className="mt-2">
        <label htmlFor="password">Password</label>
        <Input
          type="password"
          id="password"
          name="password"
          defaultValue={state.password}
        />
        {state.errors?.password?.map((e) => (
          <p key={e} className="text-sm text-red-500">
            {e}
          </p>
        ))}
      </div>
      <Button type="submit" className="mt-2 w-full">
        Sign In
      </Button>
      <p className="w-full text-center mt-2">
        New for Chat?{" "}
        <Link className="text-blue-400" to="/register">
          Sign Up
        </Link>
      </p>
    </form>
  );
}
