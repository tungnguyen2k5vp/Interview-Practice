using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPractice.Migrations
{
    /// <inheritdoc />
    public partial class StudyRecall : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Lapses",
                table: "StudyStates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Mastery",
                table: "StudyStates",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ScheduledVersion",
                table: "StudyStates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "SuggestedDue",
                table: "StudyStates",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedDays",
                table: "StudyStates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Choice",
                table: "Attempts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Correct",
                table: "Attempts",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StudySessionId",
                table: "Attempts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StudySessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Minutes = table.Column<int>(type: "int", nullable: false),
                    Plan = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudySessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudySessions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_StudySessionId_Slug",
                table: "Attempts",
                columns: new[] { "StudySessionId", "Slug" },
                unique: true,
                filter: "[StudySessionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Attempts_UserId_Slug_Version_At",
                table: "Attempts",
                columns: new[] { "UserId", "Slug", "Version", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_StudySessions_UserId_StartedAt",
                table: "StudySessions",
                columns: new[] { "UserId", "StartedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Attempts_StudySessions_StudySessionId",
                table: "Attempts",
                column: "StudySessionId",
                principalTable: "StudySessions",
                principalColumn: "Id");
            migrationBuilder.Sql("""
                UPDATE s SET ScheduledVersion = a.Version,
                    SuggestedDue = CASE WHEN s.ManualDue = 0 THEN s.Due END,
                    Mastery = CASE WHEN a.Outcome = 'skipped' OR a.AnswerSeen = 1 OR a.HintSeen = 1
                        OR s.Rating IN ('unsure','partial') THEN 'review' ELSE 'learning' END
                FROM StudyStates s JOIN Attempts a ON s.LastAttemptId = a.Id AND s.UserId = a.UserId;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attempts_StudySessions_StudySessionId",
                table: "Attempts");

            migrationBuilder.DropTable(
                name: "StudySessions");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_StudySessionId_Slug",
                table: "Attempts");

            migrationBuilder.DropIndex(
                name: "IX_Attempts_UserId_Slug_Version_At",
                table: "Attempts");

            migrationBuilder.DropColumn(
                name: "Lapses",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "Mastery",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "ScheduledVersion",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "SuggestedDue",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "VerifiedDays",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "Choice",
                table: "Attempts");

            migrationBuilder.DropColumn(
                name: "Correct",
                table: "Attempts");

            migrationBuilder.DropColumn(
                name: "StudySessionId",
                table: "Attempts");
        }
    }
}
