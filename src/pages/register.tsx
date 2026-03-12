import { useActionState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/AuthContext";
import { signUp } from "@/lib/actions";

export default function Register() {
  const [state, action] = useActionState(signUp, {});

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
        <label htmlFor="name">Full name</label>
        <Input type="name" id="name" name="name" defaultValue={state.name} />
        {state.errors?.name && (
          <p className="text-sm text-red-500">{state.errors.name}</p>
        )}
      </div>

      <div className="mt-2">
        <label htmlFor="email">Email</label>
        <Input
          type="email"
          id="email"
          name="email"
          defaultValue={state.email}
        />
        {state.errors?.email && (
          <p className="text-sm text-red-500">{state.errors.email}</p>
        )}
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
        Sign Up
      </Button>

      <p className="w-full text-center mt-2">
        Already have account?{" "}
        <Link className="text-blue-400" to="/login">
          Sign In
        </Link>
      </p>
    </form>
  );
}
