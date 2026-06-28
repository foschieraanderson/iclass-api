CREATE TYPE "public"."Role" AS ENUM('admin', 'teacher', 'student');--> statement-breakpoint
CREATE TABLE "ClassStudent" (
	"classId" text NOT NULL,
	"studentId" text NOT NULL,
	CONSTRAINT "ClassStudent_classId_studentId_pk" PRIMARY KEY("classId","studentId")
);
--> statement-breakpoint
CREATE TABLE "Class" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"period" text NOT NULL,
	"grade" text NOT NULL,
	"teacherId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Class_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "PasswordResetToken" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"code" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskSubmission" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"studentId" text NOT NULL,
	"textAnswer" text,
	"fileUrl" text,
	"grade" integer,
	"feedback" text,
	"gradedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "TaskSubmission_taskId_studentId_key" UNIQUE("taskId","studentId")
);
--> statement-breakpoint
CREATE TABLE "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"classId" text NOT NULL,
	"createdById" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"fileUrl" text,
	"score" integer NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "Role" DEFAULT 'student' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_classId_Class_id_fk" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_studentId_User_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_User_id_fk" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_studentId_User_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_classId_Class_id_fk" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "TaskSubmission_studentId_idx" ON "TaskSubmission" USING btree ("studentId");--> statement-breakpoint
CREATE INDEX "Task_classId_idx" ON "Task" USING btree ("classId");