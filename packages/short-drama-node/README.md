# `@hypit/short-drama-node`

Thin CLI bridge to Hypit's vendored `oh-my-short-drama` production engine. The upstream engine owns
the `.short-drama/` project contract, workflow gates, prompt records, task recovery and Dashboard;
Hypit does not maintain a second project-state format. These files are an isolated external workflow
format, not Hypit `@1` wire data; the bridge validates them before they become Runtime requests or
Results. Use `hypit short-drama root` to locate the bundled Skill from a separately installed Hypit Skill.
