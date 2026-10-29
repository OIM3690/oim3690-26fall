async function postMessage(text) {
  const response = await fetch("https://oim.zhili.dev/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": "lzblack"
    },
    body: JSON.stringify({ message: text })
  });
  return response.json();
}