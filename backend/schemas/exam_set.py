from pydantic import BaseModel, ConfigDict


class ExamSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    exam_id: str
    set_label: str
    question_ids: list[str]
