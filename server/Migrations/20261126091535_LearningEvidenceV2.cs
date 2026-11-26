using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPractice.Migrations
{
    /// <inheritdoc />
    public partial class LearningEvidenceV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AiAssessed",
                table: "StudyStates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EvidenceUntil",
                table: "StudyStates",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecallRevision",
                table: "StudyStates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReviewReason",
                table: "StudyStates",
                type: "nvarchar(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "StudyDay",
                table: "Attempts",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExerciseSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(90)", maxLength: 90, nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    TestVersion = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    RequestHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Assisted = table.Column<bool>(type: "bit", nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Result = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseSubmissions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KnowledgeChecks",
                columns: table => new
                {
                    AttemptId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Definition = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OpenedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    AnsweredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    StudyDay = table.Column<DateOnly>(type: "date", nullable: true),
                    Choice = table.Column<int>(type: "int", nullable: true),
                    Correct = table.Column<bool>(type: "bit", nullable: true),
                    Assisted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KnowledgeChecks", x => x.AttemptId);
                    table.ForeignKey(
                        name: "FK_KnowledgeChecks_Attempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "Attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseSubmissions_UserId_Slug_Version_RequestedAt",
                table: "ExerciseSubmissions",
                columns: new[] { "UserId", "Slug", "Version", "RequestedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExerciseSubmissions");

            migrationBuilder.DropTable(
                name: "KnowledgeChecks");

            migrationBuilder.DropColumn(
                name: "AiAssessed",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "EvidenceUntil",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "RecallRevision",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "ReviewReason",
                table: "StudyStates");

            migrationBuilder.DropColumn(
                name: "StudyDay",
                table: "Attempts");
        }
    }
}
