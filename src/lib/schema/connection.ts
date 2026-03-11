import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        recoveryPassword: {
            type: String,
        },
        recoveryPasswordExpiry: {
            type: Date,
        },
        recoveryPasswordToken: {
            type: String,
        },
        avatar: {
            type: {
                url: String,
                localPath: String,
                main: String,
            },
            default: {
                url: "http://localhost:5555/uploads/default/avatar.png",
                localPath: "",
                main: "url",
            },
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        refreshToken: {
            type: String,
        },
        emailVerificationToken: {
            type: String,
        },
        emailVerificationExpiry: {
            type: Date,
        },
        forgotPasswordToken: {
            type: String,
        },
        forgotPasswordExpiry: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);


const Users = mongoose.model("users", userSchema);
export default Users